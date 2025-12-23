import React, { useState } from 'react';
import { addEducation, deleteEducation as apiDeleteEducation } from '../../api/profile';
import moment from 'moment';
import { GraduationCap, Plus, Trash2 } from 'lucide-react';
import Modal from '../layout/Modal';
import EditSection from '../layout/EditSection';

const EducationSection = ({ education, onUpdate, isOwnProfile }) => {
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        school: '',
        degree: '',
        fieldOfStudy: '',
        from: '',
        to: '',
        current: false,
        description: ''
    });

    const { school, degree, fieldOfStudy, from, to, current, description } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onCheck = e => {
        setFormData({ ...formData, current: !current, to: '' });
    };

    const onSubmit = async e => {
        e.preventDefault();
        try {
            await addEducation(formData);
            setShowModal(false);
            setFormData({
                school: '',
                degree: '',
                fieldOfStudy: '',
                from: '',
                to: '',
                current: false,
                description: ''
            });
            onUpdate(); // Refresh profile
        } catch (err) {
            console.error(err.response?.data);
            alert('Error adding education');
        }
    };

    const deleteEducation = async (id) => {
        if (window.confirm('Are you sure you want to delete this education?')) {
            try {
                await apiDeleteEducation(id);
                onUpdate();
            } catch (err) {
                console.error(err);
                alert('Error deleting education');
            }
        }
    };

    return (
        <EditSection 
            title="Education" 
            headerAction={
                isOwnProfile && (
                    <button 
                        onClick={() => setShowModal(true)}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 text-sm font-medium"
                    >
                        <Plus size={18} /> Add Education
                    </button>
                )
            }
        >
            <div className="space-y-6">
                {education && education.length > 0 ? (
                    education.map((edu) => (
                        <div key={edu._id} className="flex gap-4 group relative">
                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                <GraduationCap size={24} className="text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="flex-grow">
                                <h3 className="font-bold text-gray-900 dark:text-white">{edu.school}</h3>
                                <p className="text-gray-700 dark:text-gray-300 text-sm">{edu.degree}, {edu.fieldOfStudy}</p>
                                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                                    {moment(edu.from).format('YYYY')} - {edu.current ? 'Present' : moment(edu.to).format('YYYY')}
                                </p>
                                {edu.description && <p className="text-gray-600 dark:text-gray-300 text-sm mt-2">{edu.description}</p>}
                            </div>
                            <button 
                                onClick={() => deleteEducation(edu._id)}
                                className="absolute right-0 top-0 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">No education added yet.</p>
                )}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Education">
                <form onSubmit={onSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">School / University</label>
                                <input 
                                    type="text" 
                                    name="school" 
                                    value={school} 
                                    onChange={onChange} 
                                    required 
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                                    placeholder="Ex: Boston University"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Degree</label>
                                    <input 
                                        type="text" 
                                        name="degree" 
                                        value={degree} 
                                        onChange={onChange} 
                                        required 
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                                        placeholder="Ex: Bachelor's"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Field of Study</label>
                                    <input 
                                        type="text" 
                                        name="fieldOfStudy" 
                                        value={fieldOfStudy} 
                                        onChange={onChange} 
                                        required 
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                                        placeholder="Ex: Computer Science"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                                    <input 
                                        type="date" 
                                        name="from" 
                                        value={from} 
                                        onChange={onChange} 
                                        required 
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                                    <input 
                                        type="date" 
                                        name="to" 
                                        value={to} 
                                        onChange={onChange} 
                                        disabled={current}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:bg-gray-100 dark:disabled:bg-gray-800 bg-white dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    name="current" 
                                    checked={current} 
                                    onChange={onCheck} 
                                    id="current"
                                    className="rounded text-indigo-600 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <label htmlFor="current" className="text-sm text-gray-700 dark:text-gray-300">I am currently studying here</label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                <textarea 
                                    name="description" 
                                    value={description} 
                                    onChange={onChange} 
                                    rows="3"
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                                    placeholder="Activities, societies, etc."
                                ></textarea>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button 
                                    type="button" 
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    Save Education
                                </button>
                            </div>
                </form>
            </Modal>
        </EditSection>
    );
};

export default EducationSection;