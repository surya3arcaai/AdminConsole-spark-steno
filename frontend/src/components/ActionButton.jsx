"use client";
import React from 'react';

export default function ActionButton({ children, className, action, style }) {
    const handleClick = () => {
        alert(action || 'Action Executed Successfully!');
    };

    return (
        <button className={className} style={style} onClick={handleClick}>
            {children}
        </button>
    );
}
