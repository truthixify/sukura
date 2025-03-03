const Loader = () => {
    return (
        <div className="flex items-center space-x-4 w-full">
            <div
                className="w-8 h-8 border-4 border-gray animate-bounce  shadow-[4px_4px_0px_0px_gray]"
                style={{ animationDelay: '0.2s' }}
            ></div>
            <div
                className="w-8 h-8 border-4 border-gray animate-bounce  shadow-[4px_4px_0px_0px_gray]"
                style={{ animationDelay: '0.4s' }}
            ></div>
            <div
                className="w-8 h-8 border-4 border-gray animate-bounce  shadow-[4px_4px_0px_0px_gray]"
                style={{ animationDelay: '0.6s' }}
            ></div>
        </div>
    )
}

export default Loader
