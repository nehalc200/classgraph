import React from "react";

export const CheckboxGroup = ({ label, id, className = "" }) => {
    return (
        <div className={`flex flex-row-reverse items-center justify-end gap-4 ${className}`}>
            <label
                htmlFor={id}
                className="font-medium text-black text-3xl text-center tracking-[-0.15px]"
            >
                {label}
            </label>
            <input
                id={id}
                type="checkbox"
                className="w-8 h-8 bg-[#d9d9d9] rounded border-gray-300 text-black focus:ring-black"
            />
        </div>
    );
};
