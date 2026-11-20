/** Opens a short-lived download link in a new tab. Ask for the link at the moment of opening: it expires in a minute. */
export default function openSignedLink(url) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
}
