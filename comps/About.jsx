import WidgetLanding from "./LandingWidget";
import LeftGrad from "./leftGrad";
import RightGrad from "./rightGrad";

const About = () => {
return(
    <>
    <div className="relative bg-[url(/star.svg)] min-h-screen" >
    <div className="leftGrad absolute bottom-0">
    <LeftGrad />
    </div>
    <div className="bg-[url(/lightAbout.svg)] bg-cover min-h-screen w-screen bg-no-repeat bg-center flex flex-col items-center justify-center space-y-6 absolute"></div>
        <div className="content !pt-[9rem]">
            <div className="heading flex justify-center !pt-[2rem] !pb-[4rem] z-10">
            <h1 className="uppercase text-5xl tracking-widest font-semibold">About <span className="text-game">the game</span></h1>
            <h1 className="uppercase text-5xl tracking-widest font-semibold absolute blur-xl  opacity-75">About <span className="text-game">the game</span></h1>
        </div>
        <div className="aboutPara flex flex-col items-center">
            <p className="w-[55rem] text-center !mb-[2rem] text-[1.25rem] font-medium">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin consequat eros vitae eros iaculis volutpat. Quisque vel elit tincidunt, eleifend lorem ac, mattis leo. Ut posuere, metus consectetur ornare consequat, enim tellus tempor urna, at scelerisque leo dolor vel massa. Cras at erat sed ligula posuere commodo ac sit amet risus.</p>
            <p className="w-[55rem] text-center !mb-[2rem] text-[1.25rem] font-medium">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin consequat eros vitae eros iaculis volutpat. Quisque vel elit tincidunt, eleifend lorem ac, mattis leo. Ut posuere, metus consectetur ornare consequat, enim tellus tempor urna, at scelerisque leo dolor vel massa. Cras at erat sed ligula posuere commodo ac sit amet risus.</p>
            <p className="w-[55rem] text-center !mb-[2rem] text-[1.25rem] font-medium">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin consequat eros vitae eros iaculis volutpat. Quisque vel elit tincidunt, eleifend lorem ac, mattis leo. Ut posuere, metus consectetur ornare consequat, enim tellus tempor urna, at scelerisque leo dolor vel massa. Cras at erat sed ligula posuere commodo ac sit amet risus.</p>
        </div>
        </div>
        <div className="rightGrad absolute top-0 right-0">
          <RightGrad />
        </div>
      <div className="widgetDiv flex items-center justify-center !pt-[12rem] !py-[2rem] !px-[2rem] relative z-[10]">
    <WidgetLanding />
      </div>
    </div>
    </>
)
}

export default About;