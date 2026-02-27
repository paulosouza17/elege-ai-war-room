import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'bottom' }) => {
    const [visible, setVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!visible || !triggerRef.current || !tooltipRef.current) return;

        const trigger = triggerRef.current.getBoundingClientRect();
        const tooltip = tooltipRef.current.getBoundingClientRect();

        let top = 0, left = 0;
        const gap = 8;

        switch (position) {
            case 'top':
                top = -(tooltip.height + gap);
                left = (trigger.width - tooltip.width) / 2;
                break;
            case 'bottom':
                top = trigger.height + gap;
                left = (trigger.width - tooltip.width) / 2;
                break;
            case 'left':
                top = (trigger.height - tooltip.height) / 2;
                left = -(tooltip.width + gap);
                break;
            case 'right':
                top = (trigger.height - tooltip.height) / 2;
                left = trigger.width + gap;
                break;
        }

        setCoords({ top, left });
    }, [visible, position]);

    return (
        <div
            ref={triggerRef}
            className="relative inline-flex"
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
        >
            {children}
            {visible && (
                <div
                    ref={tooltipRef}
                    className="absolute z-50 px-3 py-2 text-xs text-slate-200 bg-slate-800/95 border border-slate-600/50 rounded-lg shadow-xl backdrop-blur-sm max-w-[220px] whitespace-normal leading-relaxed pointer-events-none"
                    style={{ top: coords.top, left: coords.left }}
                >
                    {content}
                </div>
            )}
        </div>
    );
};
