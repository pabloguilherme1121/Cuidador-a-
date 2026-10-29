"""Real HTTP + Chromium smoke, including offline PWA under a GitHub Pages subpath.
Run: python3 tests/browser-smoke.py  (requires playwright + chromium)
"""
from pathlib import Path
from tempfile import TemporaryDirectory
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright
import os

ROOT=Path(__file__).resolve().parents[1]/'dist'
with TemporaryDirectory() as temp:
    (Path(temp)/'Cuidadora').symlink_to(ROOT, target_is_directory=True)
    handler=partial(SimpleHTTPRequestHandler,directory=temp)
    server=ThreadingHTTPServer(('127.0.0.1',0),handler)
    Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_port}/Cuidadora/'
    with sync_playwright() as p:
        executable=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium')
        browser=p.chromium.launch(headless=True,executable_path=executable,args=['--no-sandbox']) if Path(executable).exists() else p.chromium.launch(headless=True,args=['--no-sandbox'])
        for width in [320,360,390,430,844]:
            context=browser.new_context(viewport={'width':width,'height':820},service_workers='allow')
            page=context.new_page()
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            response=page.goto(url,wait_until='load')
            assert response.status==200, f'HTTP {response.status} at {url}'
            assert page.locator('h1').count(), 'No heading at first load'
            page.locator('#onboard-form button[type=submit]').click()
            assert page.locator('.tabbtn').count()==6
            assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),f'Horizontal overflow at {width}px'
            page.locator('.tabbtn[data-tab="timer"]').click()
            assert page.locator('#timer-display').inner_text()=='15:00'
            page.locator('[data-action="timer-preset"][data-minutes="5"]').click()
            page.locator('[data-action="timer-toggle"]').click()
            # Wait for a real countdown change instead of a fixed sleep under CI load.
            # Poll DOM text without unsafe-eval, which the CSP forbids.
            before=page.locator('#timer-display').inner_text()
            for _ in range(30):
                if before!='05:00': break
                page.wait_for_timeout(200)
                before=page.locator('#timer-display').inner_text()
            assert before!='05:00', f'Timer not counting at {width}px'
            # The visual ring must be driven by actual remaining time, not a fixed 75%.
            progress=page.locator('.timer-ring').evaluate("(el)=>parseFloat(el.style.getPropertyValue('--timer-progress'))")
            assert 0 <= progress < 100, f'Timer visual progress did not advance at {width}px: {progress}'
            page.reload(wait_until='load')
            page.locator('.tabbtn[data-tab="timer"]').click()
            assert page.locator('#timer-display').inner_text()!='05:00',f'Timer lost after reload at {width}px'
            page.locator('[data-action="timer-reset"]').click()
            page.locator('.tabbtn[data-tab="settings"]').click()
            assert page.locator('h1').inner_text()=='Personalização'
            assert page.locator('#private-notification-choice').is_checked(), 'Lock-screen details must be hidden by default'
            page.locator('[data-action="accent"][data-accent="ocean"]').click()
            assert page.evaluate('document.documentElement.dataset.accent')=='ocean'
            page.locator('#theme-choice').select_option('dark')
            assert page.evaluate('document.documentElement.dataset.theme')=='dark'
            page.locator('[data-action="legal"][data-page="privacidade"]').click()
            assert page.locator('#legalDialog').evaluate('(e)=>e.open')
            page.locator('[data-action="close-legal"]').click()
            page.locator('.tabbtn[data-tab="routine"]').click()
            page.locator('[data-action="add"]').first.click()
            page.locator('#item-title').fill('Almoço teste')
            page.locator('#item-times').fill('12:30')
            page.locator('#item-form button[type=submit]').click()
            assert page.get_by_text('Almoço teste').count()>0
            page.locator('#routine-search').fill('inexistente')
            assert page.locator('.routine-card:visible').count()==0
            page.locator('.tabbtn[data-tab="today"]').click()
            page.locator('[data-action="add"][data-type="med"]').first.click()
            page.locator('#item-title').fill('Medicamento teste')
            page.locator('#item-dose').fill('Conforme receita')
            page.locator('#item-times').fill('08:00, 20:00')
            page.locator('#item-form button[type=submit]').click()
            page.locator('[data-action="filter"][data-filter="med"]').click()
            assert page.locator('.entry').count()==2
            # Edit an individual recurring medication time without changing the second one.
            row0800=page.locator('.entry').filter(has=page.locator('.entry-time',has_text='08:00'))
            row0800.locator('[data-action="timeline-edit"]').click()
            assert page.locator('#confirmDialog').evaluate('(e)=>e.open')
            page.locator('#timeline-time-value').fill('09:15')
            page.locator('#timeline-time-form button[type=submit]').click()
            assert page.locator('.entry-time').all_inner_texts()==['09:15','20:00']
            # Mark a completed occurrence, then move its schedule again: history is preserved.
            page.locator('.entry').first.locator('[data-action="toggle"]').click()
            page.locator('.entry[data-occ-key$="09:15"] [data-action="timeline-edit"]').click()
            page.locator('#timeline-time-value').fill('10:00')
            page.locator('#timeline-time-form button[type=submit]').click()
            assert page.locator('.entry-time').all_inner_texts()==['09:15','10:00','20:00']
            page.locator('.entry[data-occ-key$="20:00"] [data-action="timeline-remove"]').click()
            assert page.locator('#confirmDialog').evaluate('(e)=>e.open')
            page.locator('[data-action="timeline-confirm-remove"]').click()
            assert page.locator('.entry-time').all_inner_texts()==['09:15','10:00']
            assert page.locator('.entry[data-occ-key$="09:15"] .status').inner_text()=='Concluído'
            assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),f'Timeline overflow at {width}px'

            page.locator('.tabbtn[data-tab="history"]').click()
            assert page.get_by_text('Medicamento teste').count()>=2
            if width==390:
                # Check real Service Worker interception: reload while offline, same subdirectory scope.
                page.evaluate('navigator.serviceWorker.ready')
                page.reload(wait_until='load')
                page.wait_for_function('navigator.serviceWorker.controller !== null',timeout=12000)
                context.set_offline(True)
                page.reload(wait_until='load')
                assert page.locator('.tabbtn').count()==6,'Offline content unavailable'
                page.locator('.tabbtn[data-tab="routine"]').click()
                assert page.get_by_text('Almoço teste').count()>0,'Local data not available offline'
                context.set_offline(False)
            page.locator('.tabbtn[data-tab="settings"]').click()
            page.locator('[data-action="wipe"]').click()
            assert page.locator('#confirmDialog').evaluate('(e)=>e.open')
            page.locator('[data-action="cancel-delete"]').click()
            assert page.locator('#confirmDialog').evaluate('(e)=>!e.open')
            assert not errors,f'JavaScript exception at {width}px: {errors}'
            print(f'{width}px: HTTP, UX, timer reload, theme, CRUD, history, search and privacy OK')
            context.close()
        browser.close()
    server.shutdown()
