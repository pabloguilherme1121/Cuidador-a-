/** Budget forecasting, NOT a proof of cloud capacity or a load generator. */
const FREE_REQUESTS_PER_DAY=100000;
export const estimateRequests=({users,minutesPerDay=30,roomOpenFraction=0.5,chatOpenFraction=0.2,chatPollSeconds=180,assetsPerUser=3,manualActionsPerUser=2})=>{
 if(![users,minutesPerDay,roomOpenFraction,chatOpenFraction,chatPollSeconds,assetsPerUser,manualActionsPerUser].every(x=>Number.isFinite(x)&&x>=0)||roomOpenFraction>1||chatOpenFraction>1||chatPollSeconds<30)throw new Error('Invalid model input');
 const rooms=users*minutesPerDay*roomOpenFraction/4; // room sync: 4 minutes
 const chats=users*minutesPerDay*60*chatOpenFraction/chatPollSeconds;
 const assets=users*assetsPerUser;const actions=users*manualActionsPerUser;
 const total=Math.ceil(rooms+chats+assets+actions);
 return {rooms:Math.ceil(rooms),chats:Math.ceil(chats),assets:Math.ceil(assets),actions:Math.ceil(actions),total,share:total/FREE_REQUESTS_PER_DAY,remaining:FREE_REQUESTS_PER_DAY-total};
};
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].replace(/^.*\//,'/'))){
 for(const users of [1000,3000,5000,10000]){
  const result=estimateRequests({users});console.log(JSON.stringify({dailyActiveUsers:users,...result}));
 }
}
