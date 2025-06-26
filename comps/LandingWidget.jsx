import Image from "next/image";

const WidgetLanding = () => {
    return(
        <div className="w-[70rem] h-[30rem] bg-[rgba(0, 0, 0, 0.52) border-[1.5px] border-border rounded-2xl flex items-center justify-around !px-[2rem] backdrop-blur-xl hover:bg-black/40 duration-[350ms] ease-out hover:border-white/20">
            <div className="content w-fit flex flex-col gap-8">
                <h1 className="text-3xl tracking-widest uppercase font-medium">Join. Code. <span className="underline text-game">Dominate.</span></h1>
                <p className="tracking-wide !mt-[0.5rem] w-[38rem] text-md opacity-50">Step into the arena of 1v1 coding battles — fast-paced, competitive, and made for developers who dare to dominate. Sign up now to challenge players, climb the ranks, and prove you’ve got what it takes to be the last coder standing.</p>
                <div className="btn w-full h-[5rem] border-[1px] border-border rounded-md uppercase flex items-center justify-center tracking-wider text-md bg-bgBtn hover:text-[1.05rem] hover:tracking-widest hover:font-semibold hover:border-onHoverBorder hover:text-white text-white/60 duration-[200ms] ease-out">Register</div>
            </div>
            <div className="">
                <Image src="/svgWidget.svg" width={350} height={1} />
            </div>
        </div>
    )
}

export default WidgetLanding;