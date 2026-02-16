import React from "react";

export const SelectGroup = ({ label, id, options = [], className = "", value, onChange }) => {
    return (
        <div className={`flex flex-col items-center gap-2 ${className}`}>
            <label
                htmlFor={id}
                className="font-medium text-black text-3xl text-center tracking-[-0.15px]"
            >
                {label}
            </label>
            <select
                id={id}
                className="w-full h-[70px] bg-[#d9d9d9] rounded-none border-none px-4 text-xl focus:outline-none focus:ring-2 focus:ring-black appearance-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: `right 0.5rem center`,
                    backgroundRepeat: `no-repeat`,
                    backgroundSize: `1.5em 1.5em`,
                    paddingRight: `2.5rem`
                }}
                value={value}
                onChange={onChange}
            >
                <option value="" disabled>Select a {label}</option>
                {options.map((option) => {
                    const value = typeof option === 'object' ? option.value : option;
                    const labelText = typeof option === 'object' ? option.label : option;
                    return (
                        <option key={value} value={value} title={labelText}>
                            {labelText.length > 50 ? `${labelText.substring(0, 50)}...` : labelText}
                        </option>
                    );
                })}


            </select>
        </div>
    );
};
