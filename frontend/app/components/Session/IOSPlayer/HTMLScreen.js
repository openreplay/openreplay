import { observer } from 'mobx-react-lite';
import cn from 'classnames';
import Screen from './ScreenWithLoaders';
//import cls from './HTMLScreen.module.css';


const DEVICE_MAP = {
  "iPhone 4s": "iphone4s",
  "iPhone 5s": "iphone5s",
  "iPhone 5c": "iphone5c",
  "iPhone 8": "iphone8",
  "iPhone 8 Plus": "iphone8plus",
  "iPhone X": "iphone-x",
}

function mapDevice(device) {
  if (!!DEVICE_MAP[ device ]) {
    return DEVICE_MAP[ device ];
  }
  if (device.includes("iPhone")) {
    return "iphone8"; // ??
  }
  if (device.includes("iPad")) {
    return "iPad";
  }
  return "macbook";
}

function getDefaultColor(type) {
  if (type === "iphone5c") {
    return "white";
  }
  if (type === "iphone-x" || type === "macbook") {
    return "";
  }
  return "black";
}


function BeforeScreen({ type }) {
  if (type === "ipad") {
    return <div className="camera"></div>
  }
  if (type === "iphone-x") {
    return (
      <>
        <div className="notch">
          <div className="camera"></div>
          <div className="speaker"></div>
        </div>
        <div className="top-bar"></div>
        <div className="sleep"></div>
        <div className="bottom-bar"></div>
        <div className="volume"></div>
        <div className="overflow">
            <div className="shadow shadow--tr"></div>
            <div className="shadow shadow--tl"></div>
            <div className="shadow shadow--br"></div>
            <div className="shadow shadow--bl"></div>
        </div>
        <div className="inner-shadow"></div>
      </>
    );
  }
  if (type === "macbook") {
    return (
      <>
        <div className="top-bar"></div>
        <div className="camera"></div>
      </>
    );
  }
  return (
    <>
      <div className="top-bar"></div>
      <div className="sleep"></div>
      <div className="volume"></div>
      <div className="camera"></div>
      <div className="sensor"></div>
      <div className="speaker"></div>
    </>
  );
}

function AfterScreen({ type }) {
  if (type === "ipad") {
    return <div className="home"></div>;
  }
  if (type === "macbook") {
    return <div className="bottom-bar"></div>;
  }
  if (type === "iphone-x") {
    return null;
  }
  return (
    <>
      <div className="home"></div>
      <div className="bottom-bar"></div>
    </>
  );
}
 

function HTMLScreen({ wrapperId, screenId, device, player }) {
  const type = mapDevice(device);
  const color = getDefaultColor(type);
  
  return (
    <>
      <link rel="stylesheet" type="text/css" href="/marvel-device.css" />
      <div 
        className={ cn("marvel-device iphone5c", type, color, { "landscape": player.state.orientationLandscape }) } 
        id={wrapperId}
      >
          <BeforeScreen type={ type } />
          <Screen className="screen" screenId={screenId} player={player}/>
          <AfterScreen type={ type } />
      </div>
    {/* <div className={cls.iphone} id={ id }> */}
    {/*   <i></i> */}
    {/*   <b></b> */}
    {/*   <span></span> */}
    {/*   <span></span> */}
    {/* </div> */}
    </>
  );
}
export default observer(HTMLScreen);

// iphone8 iphone8plus  iphone5s iphone5c(white) iphone4s
// <div className="marvel-device iphone8 black">
//     <div className="top-bar"></div>
//     <div className="sleep"></div>
//     <div className="volume"></div>
//     <div className="camera"></div>
//     <div className="sensor"></div>
//     <div className="speaker"></div>
//     <div className="screen">
//         <!-- Content goes here -->
//     </div>
//     <div className="home"></div>
//     <div className="bottom-bar"></div>
// </div>
// 
// 
// <div className="marvel-device iphone-x">
//     <div className="notch">
//         <div className="camera"></div>
//         <div className="speaker"></div>
//     </div>
//     <div className="top-bar"></div>
//     <div className="sleep"></div>
//     <div className="bottom-bar"></div>
//     <div className="volume"></div>
//     <div className="overflow">
//         <div className="shadow shadow--tr"></div>
//         <div className="shadow shadow--tl"></div>
//         <div className="shadow shadow--br"></div>
//         <div className="shadow shadow--bl"></div>
//     </div>
//     <div className="inner-shadow"></div>
//     <div className="screen">
//         <!-- Content goes here -->
//     </div>
// </div>
// 
// <div className="marvel-device ipad silver">
//     <div className="camera"></div>
//     <div className="screen">
//         <!-- Content goes here -->
//     </div>
//     <div className="home"></div>
// </div>
// 
// 
// <div className="marvel-device macbook">
//     <div className="top-bar"></div>
//     <div className="camera"></div>
//     <div className="screen">
//         <!-- Content goes here -->
//     </div>
//     <div className="bottom-bar"></div>
// </div>
// 
// 
