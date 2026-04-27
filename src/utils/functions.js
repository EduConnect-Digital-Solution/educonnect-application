export const loadNeetoCalEmbed = () => {
    if (!window.neetoCal) {
        const script = document.createElement("script");
        script.src = "https://cdn.neetocal.com/javascript/embed.js";
        script.async = true;
        script.onload = () => {
            window.neetoCal.embed({
                type: "inline",
                id: "a8c7f98c-010b-495e-8fc2-067f9c6d38b8",
                organization: "educonnect-digital-solutions",
                elementSelector: "#inline-embed-container",
                styles: { height: "100%", width: "100%"},
            });
        };
        document.body.appendChild(script);
    } else {
        // Script already loaded
        window.neetoCal.embed({
            type: "inline",
            id: "a8c7f98c-010b-495e-8fc2-067f9c6d38b8",
            organization: "educonnect-digital-solutions",
            elementSelector: "#inline-embed-container",
            styles: { height: "100%", width: "100%" },
        });
    }
};

