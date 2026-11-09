import React from 'react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import EventPlanner from "./EventPlanner.jsx";

export default function EventPage() {
    return (
        <AdminLayout>
            <EventPlanner />
        </AdminLayout>
    );
}
