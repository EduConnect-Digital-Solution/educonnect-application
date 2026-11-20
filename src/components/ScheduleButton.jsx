import React, { useEffect } from 'react';
import { loadNeetoCalPopup } from '../utils/functions.js';

/**
 * "Book Consultation" button. The booking widget's third-party script is loaded only when this
 * button is on screen, never on the signed-in app pages.
 */
export default function ScheduleButton() {
    useEffect(() => { loadNeetoCalPopup('#open-popup-button'); }, []);

    return (
        <div className="nav-btn">
            <button id="open-popup-button" className="mt-4 bg-[#002684] text-white text-center w-full px-4 py-2 rounded-full">Book Consultation</button>
        </div>
    );
}
