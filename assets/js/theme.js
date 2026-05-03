tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            "colors": {
                "primary-fixed": "#e9ddff",
                "surface": "#15121b",
                "on-tertiary-container": "#3f2300",
                "on-secondary-fixed": "#07006c",
                "tertiary": "#ffb869",
                "surface-bright": "#3b3742",
                "secondary-container": "#3131c0",
                "error": "#ffb4ab",
                "tertiary-container": "#ca801e",
                "surface-tint": "#d0bcff",
                "on-tertiary-fixed": "#2c1700",
                "primary-fixed-dim": "#d0bcff",
                "on-primary-fixed": "#23005c",
                "inverse-surface": "#e7e0ed",
                "on-primary-container": "#340080",
                "on-background": "#e7e0ed",
                "background": "#15121b",
                "tertiary-fixed-dim": "#ffb869",
                "secondary": "#c0c1ff",
                "on-primary": "#3c0091",
                "surface-container-low": "#1d1a23",
                "inverse-primary": "#6d3bd7",
                "on-secondary-container": "#b0b2ff",
                "on-surface": "#e7e0ed",
                "primary-container": "#a078ff",
                "on-tertiary": "#482900",
                "error-container": "#93000a",
                "surface-container-lowest": "#0f0d15",
                "on-surface-variant": "#cbc3d7",
                "primary": "#d0bcff",
                "surface-container-high": "#2c2832",
                "secondary-fixed": "#e1e0ff",
                "on-error-container": "#ffdad6",
                "surface-container-highest": "#37333d",
                "on-secondary-fixed-variant": "#2f2ebe",
                "outline": "#958ea0",
                "on-primary-fixed-variant": "#5516be",
                "on-secondary": "#1000a9",
                "on-error": "#690005",
                "tertiary-fixed": "#ffdcbb",
                "surface-dim": "#15121b",
                "surface-container": "#211e27",
                "inverse-on-surface": "#322f39",
                "outline-variant": "#494454",
                "surface-variant": "#37333d",
                "secondary-fixed-dim": "#c0c1ff",
                "on-tertiary-fixed-variant": "#673d00"
            },
            "borderRadius": {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "full": "9999px"
            },
            "spacing": {
                "unit": "8px",
                "container-padding": "24px",
                "gutter": "16px",
                "list-item-gap": "4px",
                "card-gap": "12px"
            },
            "fontFamily": {
                "body-sm": ["Inter"],
                "label-caps": ["Inter"],
                "h2": ["Inter"],
                "body-base": ["Inter"],
                "mono": ["ui-monospace, SFMono-Regular"],
                "h1": ["Inter"]
            },
            "fontSize": {
                "body-sm": ["13px", { "lineHeight": "18px", "fontWeight": "400" }],
                "label-caps": ["11px", { "lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "600" }],
                "h2": ["20px", { "lineHeight": "28px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
                "body-base": ["14px", { "lineHeight": "20px", "fontWeight": "400" }],
                "mono": ["12px", { "lineHeight": "16px", "fontWeight": "400" }],
                "h1": ["24px", { "lineHeight": "32px", "letterSpacing": "-0.02em", "fontWeight": "600" }]
            }
        }
    }
}
