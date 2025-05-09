import React, { useState, useEffect, type KeyboardEvent, type FocusEvent, useRef } from 'react';
import { X as RemoveIcon } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import type { Tag } from '../../types';
import classNames from 'classnames';

interface TagInputProps {
    selectedTags: string[];
    onChangeSelectedTags: (tags: string[]) => void;
    label?: string;
    placeholder?: string;
}

const TagInput: React.FC<TagInputProps> = ({ selectedTags, onChangeSelectedTags, label = "Tags", placeholder = "Add tags..." }) => {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState<Tag[]>([]);
    const [allUserTags, setAllUserTags] = useState<Tag[]>([]);
    const { user } = useAuth();
    const suggestionsListRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        const fetchTags = async () => {
            if (!user) return;
            const { data, error } = await supabase
                .from('tags')
                .select('id, user_id, name, created_at')
                .eq('user_id', user.id);
            if (error) {
                console.error("Error fetching tags:", error);
            } else {
                setAllUserTags(data || []);
            }
        };
        fetchTags();
    }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
        if (value.trim()) {
            const filteredSuggestions = allUserTags.filter(
                tag => tag.name.toLowerCase().includes(value.toLowerCase()) && !selectedTags.includes(tag.name)
            );
            setSuggestions(filteredSuggestions.slice(0, 5));
        } else {
            setSuggestions([]);
        }
    };

    const addTag = (tagName: string) => {
        const trimmedTag = tagName.trim();
        if (trimmedTag && !selectedTags.includes(trimmedTag)) {
            onChangeSelectedTags([...selectedTags, trimmedTag]);
        }
        setInputValue('');
        setSuggestions([]);
    };

    const removeTag = (tagToRemove: string) => {
        onChangeSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            if (inputValue.trim()) {
                addTag(inputValue);
            }
        }
    };

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
        if (suggestionsListRef.current && suggestionsListRef.current.contains(e.relatedTarget as Node)) {
            return;
        }
        setTimeout(() => {
            if (inputValue.trim()) {
                addTag(inputValue);
            }
        }, 0);
    };


    return (
        <div className="w-full">
            {label && <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">{label}</label>}
            <div className={classNames(
                "flex flex-wrap items-center gap-2 p-2 border rounded-md",
                "form-input-base" // Use base input styling for the container
            )}>
                {selectedTags.map(tag => (
                    <span key={tag} className="flex items-center bg-primary-100 dark:bg-primary-700 text-primary-700 dark:text-primary-100 text-xs font-medium px-2.5 py-1 rounded-full">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="ml-1.5 text-primary-500 dark:text-primary-200 hover:text-primary-700 dark:hover:text-primary-50">
                            <RemoveIcon size={14} />
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    placeholder={selectedTags.length === 0 ? placeholder : "Add more..."}
                    // Removed specific bg/text/placeholder classes here, relying on form-input-base from parent or direct styling if needed
                    className="flex-grow p-1 bg-transparent focus:outline-none text-sm"
                />
            </div>
            {suggestions.length > 0 && (
                <ul ref={suggestionsListRef} className="border border-t-0 input-border-color rounded-b-md max-h-40 overflow-y-auto shadow-lg bg-white dark:bg-dark-input">
                    {suggestions.map(suggestion => (
                        <li
                            key={suggestion.id}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                addTag(suggestion.name);
                            }}
                            className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-dark-text"
                        >
                            {suggestion.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default TagInput;