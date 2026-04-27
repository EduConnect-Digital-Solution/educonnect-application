import React, {useCallback, useState} from 'react';
import { MapPin, Mail, Phone, Send } from 'lucide-react';
import {Images} from "./images.jsx";
import ContactPage from "../pages/ContactForm.jsx";
import { FaTiktok, FaLinkedinIn, FaFacebookF } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import {navItems} from "../utils/imports.jsx";

export default function Footer() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: '',
        phone: '',
        message: ''
    });

    const [newsletterEmail, setNewsletterEmail] = useState('');

    const handleNewsletterSubmit = () => {
        // Add your newsletter subscription logic here
        alert('Successfully subscribed to our newsletter!');
        setNewsletterEmail('');
    };
    const mapNavKeytoID = useCallback((key) => {
        switch (key) {
            case 'home': return 'home';
            case 'about': return 'about';
            case 'services': return 'services';
            case 'resources': return 'resources';
            case 'faqs': return 'faqs';
        }
    }, []);

    const smoothScrollTo = useCallback((targetId) => {
        const el = document.getElementById(targetId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (targetId === 'home') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, []);

    const handleNavClick = useCallback((itemKey) => {
        const id = mapNavKeytoID(itemKey);
        smoothScrollTo(id);
        // Close mobile if open
    }, [mapNavKeytoID, smoothScrollTo]);

    return (
        <div>
            {/* Footer */}
            <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
                <div className="max-w-7xl mx-auto px-4 py-16">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">

                        {/* Company Info */}
                        <div className="lg:col-span-2">
                            <div className="mb-6">
                                <img
                                    src={`${Images.main_logo}`} // Placeholder for the book icon
                                    alt="EduConnect Logo Icon"
                                    className="w-[120px] md:w-[170px]"
                                />
                            </div>
                            <p className="text-gray-400 mb-6 leading-relaxed">
                                Transforming education in Nigeria through innovative digital solutions. Empowering schools, teachers, students, and parents with technology that works.
                            </p>
                            <div className="flex gap-3 mb-6">
                                <a href="https://www.facebook.com/share/1CXEP3NKAo/" target={"_blank"} className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors duration-200">
                                    <FaFacebookF className="w-5 h-5" />
                                </a>
                                <a href="https://x.com/educonnecthq" target={"_blank"} className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors duration-200">
                                    <FaXTwitter className="w-5 h-5" />
                                </a>
                                <a href="https://www.linkedin.com/company/educonnectng/" target={"_blank"} className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors duration-200">
                                    <FaLinkedinIn className="w-5 h-5" />
                                </a>
                                <a href="https://www.tiktok.com/@educonnecthq" target={"_blank"} className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors duration-200">
                                    <FaTiktok className="w-5 h-5" />
                                </a>
                            </div>

                            {/* Newsletter Signup */}
                            <div className="bg-white/10 rounded-2xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <Send className="w-6 h-6 text-blue-400" />
                                    <h4 className="text-xl font-bold">Stay Updated</h4>
                                </div>
                                <p className="text-gray-300 text-sm mb-4">
                                    Subscribe to our newsletter for weekly news and updates.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <input
                                        type="email"
                                        placeholder="Your email"
                                        value={newsletterEmail}
                                        onChange={(e) => setNewsletterEmail(e.target.value)}
                                        className="flex-1 px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                    <button
                                        onClick={handleNewsletterSubmit}
                                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl whitespace-nowrap"
                                    >
                                        Subscribe
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h4 className="text-lg font-bold mb-4">Quick Links</h4>
                            <ul className="space-y-3">
                                {navItems.map((item) => (
                                    <div key={item.label} className="relative">
                                        <button onClick={() => handleNavClick(item.key)} className="flex hover:cursor-pointer items-center gap-1 text-gray-400 hover:text-teal-700 transition-colors">
                                            {item.label}
                                        </button>
                                    </div>
                                ))}
                            </ul>
                        </div>

                        {/* Solutions */}
                        <div>
                            <h4 className="text-lg font-bold mb-4">Legal</h4>
                            <ul className="space-y-3">
                                <li><a href="/legal-documents/terms-of-service" className="text-gray-400 hover:text-white transition-colors duration-200">Terms of Service</a></li>
                                <li><a href="/legal-documents/privacy-policy" className="text-gray-400 hover:text-white transition-colors duration-200">Privacy Policy</a></li>
                                <li><a href="/legal-documents/information-security" className="text-gray-400 hover:text-white transition-colors duration-200">Information Security Policy</a></li>
                            </ul>
                        </div>

                    </div>

                    {/* Bottom Bar */}
                    <div className="pt-8 border-t border-gray-700">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <p className="text-gray-400 text-sm text-center md:text-left">
                                © 2026 EduConnect Digital Solutions. All rights reserved.
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}