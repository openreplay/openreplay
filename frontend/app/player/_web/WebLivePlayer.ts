// import WebPlayer from './WebPlayer'
// import AssistManager from './assist/AssistManager'


// export default class WebLivePlayer extends WebPlayer {
//   assistManager: AssistManager // public so far
//   constructor(private wpState: Store<MMState & PlayerState>, session, config: RTCIceServer[]) {
//     super(wpState)
//     this.assistManager = new AssistManager(session, this.messageManager, config, wpState)
//     const endTime = !live && session.duration.valueOf()
//     wpState.update({
//       //@ts-ignore
//       initialized: true,
//       //@ts-ignore
//       session,
      
//       live: true,
//       livePlay: true,
//     })

//     this.assistManager.connect(session.agentToken)
//   }
// }