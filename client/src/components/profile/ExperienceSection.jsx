import React, { useState } from 'react';
import { addExperience, deleteExperience as apiDeleteExperience } from '../../api/profile';
import moment from 'moment';
import { Briefcase, Plus, Trash2 } from 'lucide-react';
import Modal from '../layout/Modal';
import EditSection from '../layout/EditSection';

const ExperienceSection = ({ experience, onUpdate, isOwnProfile }) => {
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        company: '',
        location: '',
        from: '',
        to: '',
        current: false,
        description: ''
    });

    const { title, company, location, from, to, current, description } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onCheck = e => {
        setFormData({ ...formData, current: !current, to: '' });
    };

    const onSubmit = async e => {
        e.preventDefault();
        try {
            await addExperience(formData);
            setShowModal(false);
            setFormData({
                title: '',
                company: '',
                location: '',
                from: '',
                to: '',
                current: false,
                description: ''
            });
            onUpdate(); // Refresh profile
        } catch (err) {
            console.error(err.response?.data);
            alert('Error adding experience');
        }
    };

    const deleteExperience = async (id) => {
        if (window.confirm('Are you sure you want to delete this experience?')) {
            try {
                await apiDeleteExperience(id);
                onUpdate();
            } catch (err) {
                console.error(err);
                alert('Error deleting experience');
            }
        }
    };

    return (
        <EditSection 
            title="Experience" 
            headerAction={
                isOwnProfile && (
                    <button 
                        onClick={() => setShowModal(true)}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 text-sm font-medium"
                    >
                        <Plus size={18} /> Add Experience
                    </button>
                )
            }
        >
            <div className="space-y-6">
                {experience && experience.length > 0 ? (
                    experience.map((exp) => (
                        <div key={exp._id} className="flex gap-4 group relative">
                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Briefcase size={24} className="text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="flex-grow">
                                <h3 className="font-bold text-gray-900 dark:text-white">{exp.title}</h3>
                                <p className="text-gray-700 dark:text-gray-300 text-sm">{exp.company}</p>
                                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                                    {moment(exp.from).format('MMM YYYY')} - {exp.current ? 'Present' : moment(exp.to).format('MMM YYYY')}
                                </p>
                                {exp.description && <p className="text-gray-600 dark:text-gray-300 text-sm mt-2">{exp.description}</p>}
                            </div>
                            {isOwnProfile && (
                                <button 
                                    onClick={() => deleteExperience(exp._id)}
                                    className="absolute right-0 top-0 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">No experience added yet.</p>
                )}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Experience">
                <form onSubmit={onSubmit} className="space-y-4">
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Job Title"
                                            name="title"
                                            value={title}
                                            onChange={onChange}
                                            required
                                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Company"
                                            name="company"
                                            value={company}
                                            onChange={onChange}
                                            required
                                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Location"
                                            name="location"
                                            value={location}
                                            onChange={onChange}
                                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">From Date</label>
                                            <input
                                                type="date"
                                                name="from"
                                                value={from}
                                                onChange={onChange}
                                                required
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">To Date</label>
                                            <input
                                                type="date"
                                                name="to"
                                                value={to}
                                                onChange={onChange}
                                                disabled={current}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md disabled:bg-gray-100 dark:disabled:bg-gray-800 bg-white dark:bg-gray-700 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="current"
                                            checked={current}
                                            onChange={onCheck}
                                            id="current"
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                                        />
                                        <label htmlFor="current" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                                            Current Job
                                        </label>
                                    </div>
                                    <div>
                                        <textarea
                                            name="description"
                                            cols="30"
                                            rows="5"
                                            placeholder="Job Description"
                                            value={description}
                                            onChange={onChange}
                                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white"
                                        ></textarea>
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700"
                                    >
                                        Add Experience
                                    </button>
                </form>
            </Modal>
        </EditSection>
    );
};

export default ExperienceSection;