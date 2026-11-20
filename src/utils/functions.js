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

const NEETOCAL_SRC = 'https://cdn.neetocal.com/javascript/embed.js';

/**
 * Opens the booking popup when `elementSelector` is clicked. The script is added on demand
 * (once) instead of sitting in index.html, where it ran on every page of the signed-in app.
 */
export const loadNeetoCalPopup = (elementSelector) => {
    window.neetoCal = window.neetoCal || { embed: function () { (window.neetoCal.q = window.neetoCal.q || []).push(arguments); } };
    if (!document.querySelector(`script[src="${NEETOCAL_SRC}"]`)) {
        const script = document.createElement('script');
        script.src = NEETOCAL_SRC;
        script.async = true;
        document.body.appendChild(script);
    }
    window.neetoCal.embed({
        type: 'elementClick',
        id: 'a8c7f98c-010b-495e-8fc2-067f9c6d38b8',
        organization: 'educonnect-digital-solutions',
        elementSelector,
        isSidebarAndCoverImgHidden: 'false',
        shouldForwardQueryParams: 'false',
    });
};
