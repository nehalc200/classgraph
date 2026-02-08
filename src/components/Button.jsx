import React from "react";

export const Button = ({ children, onClick, className = "" }) => {
    return (
        <button
            onClick={onClick}
            className={`inline-flex items-center justify-center gap-2 px-6 py-3 bg-black rounded-xl hover:bg-gray-800 transition-colors ${className}`}
        >
            <span className="font-medium text-white text-lg text-center tracking-[-0.09px]">
                {children}
            </span>
        </button>
    );
};
