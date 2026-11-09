import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Search, ChevronDown, ChevronRight, BookOpen, User, Layers, Users } from 'lucide-react';
import { useTimetable } from '../TimetableContext';
import { getSubjectColor } from '../TimetableContext';

/**
 * PalettePanel
 * ───────────────────────────────
 * Left sidebar containing draggable entities (Subjects, Teachers, Rooms).
 */
export default function PalettePanel({ resources }) {
  const { state } = useTimetable();
  const { subjects, teachers, arms } = resources;

  const [openSections, setOpenSections] = useState({
    subjects: true,
    teachers: true,
    arms: false
  });

  const toggle = (section) => setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));

  // Search filter
  const [search, setSearch] = useState('');
  const term = search.toLowerCase();

  const filteredSubjects = subjects.filter(s => s.name.toLowerCase().includes(term));
  const filteredTeachers = teachers.filter(t => t.name.toLowerCase().includes(term));

  // Extract arms that belong to the currently selected class
  const classArms = state.selectedClass
    ? arms.filter(arm => arm.classId === state.selectedClass.id)
    : [];

  const filteredArms = classArms.filter(a => a.name.toLowerCase().includes(term));

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex-col h-full shrink-0 hidden lg:flex">
      {/* Header & Search */}
      <div className="p-4 border-b border-gray-100 shrink-0">
        <h2 className="font-bold text-gray-800 mb-3">Palette</h2>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search parts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        
        {/* Subjects Section */}
        <div>
          <button onClick={() => toggle('subjects')} className="flex items-center justify-between w-full p-1 text-sm font-semibold text-gray-600 hover:text-gray-900 group">
            <span className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> Subjects ({filteredSubjects.length})</span>
            {openSections.subjects ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
          </button>
          
          {openSections.subjects && (
            <div className="mt-2 space-y-1.5 pl-1">
              {filteredSubjects.length === 0 ? (
                <p className="text-xs text-gray-400 p-2 text-center bg-gray-50 rounded">No subjects found.</p>
              ) : (
                filteredSubjects.map(subject => (
                  <PaletteItem key={subject.id} id={`base_${subject.id}`} type="SUBJECT" payload={subject} arms={arms} />
                ))
              )}
            </div>
          )}
        </div>

        {/* Teachers Section */}
        <div>
          <button onClick={() => toggle('teachers')} className="flex items-center justify-between w-full p-1 text-sm font-semibold text-gray-600 hover:text-gray-900 group">
            <span className="flex items-center gap-2"><User className="w-4 h-4" /> Teachers ({filteredTeachers.length})</span>
            {openSections.teachers ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
          </button>
          
          {openSections.teachers && (
            <div className="mt-2 space-y-1.5 pl-1">
               {filteredTeachers.length === 0 ? (
                <p className="text-xs text-gray-400 p-2 text-center bg-gray-50 rounded">No teachers found.</p>
              ) : (
                filteredTeachers.map(teacher => (
                  <PaletteItem key={teacher.id} id={`base_${teacher.id}`} type="TEACHER" payload={teacher} arms={arms} />
                ))
              )}
            </div>
          )}
        </div>

        {/* Arms Section  (HIDDEN BECAUSE THE ARMS IS AUTOMATIC)*/}
        {/*<div>*/}
        {/*  <button onClick={() => toggle('arms')} className="flex items-center justify-between w-full p-1 text-sm font-semibold text-gray-600 hover:text-gray-900 group">*/}
        {/*    <span className="flex items-center gap-2"><Layers className="w-4 h-4" /> Arms/Streams ({filteredArms.length})</span>*/}
        {/*    {openSections.arms ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}*/}
        {/*  </button>*/}
        {/*  */}
        {/*  {openSections.arms && (*/}
        {/*    <div className="mt-2 space-y-1.5 pl-1">*/}
        {/*       {filteredArms.length === 0 ? (*/}
        {/*        <p className="text-xs text-gray-400 p-2 text-center bg-gray-50 rounded">No arms found for {state.selectedClass?.name}.</p>*/}
        {/*      ) : (*/}
        {/*        filteredArms.map(arm => (*/}
        {/*          <PaletteItem key={arm.id} id={`base_arm_${arm.id}`} type="ARM" payload={arm} />*/}
        {/*        ))*/}
        {/*      )}*/}
        {/*    </div>*/}
        {/*  )}*/}
        {/*</div>*/}

      </div>
    </div>
  );
}

// ─── Draggable Item Component ────
function PaletteItem({ id, type, payload, arms = [] }) {
  const { state } = useTimetable();
  // Dragging is disabled when: published, no class, or class has arms but none selected yet.
  const classArms = state.selectedClass
    ? arms.filter(a => a.classId === state.selectedClass.id)
    : [];
  const needsArm = classArms.length > 0 && !state.selectedArm;
  const isDragDisabled = state.isPublished || !state.selectedClass || needsArm;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: { type, payload },
    disabled: isDragDisabled,
  });

  const name = payload.name;

  let Icon = BookOpen;
  let baseStyle = 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300';
  
  if (type === 'SUBJECT') {
    Icon = BookOpen;
    const color = getSubjectColor(payload.id);
    baseStyle = `${color.bg} ${color.text} ${color.border}`;
  } else if (type === 'TEACHER') {
    Icon = User;
  } else if (type === 'ARM') {
    Icon = Users;
  }

  const disabledClass = isDragDisabled ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-grab active:cursor-grabbing hover:shadow-sm hover:-translate-y-px transition-all';

  return (
    <div
      ref={setNodeRef}
      {...(isDragDisabled ? {} : listeners)}
      {...(isDragDisabled ? {} : attributes)}
      className={`relative p-2 rounded-lg border text-xs font-semibold flex items-center gap-2 select-none ${baseStyle} ${disabledClass} ${isDragging ? 'opacity-30' : ''}`}
    >
      <Icon size={12} className="opacity-70" />
      <span className="truncate flex-1">{name}</span>
      {type === 'SUBJECT' && payload.code && (
        <span className="text-[10px] opacity-60 uppercase shrink-0">{payload.code}</span>
      )}
    </div>
  );
}
