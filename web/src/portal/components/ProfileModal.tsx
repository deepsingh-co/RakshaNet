import { useState } from 'react';
import { X, Shield, Save } from 'lucide-react';
import { usePortalStore } from '../store/portalStore';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const currentUser = usePortalStore((s) => s.currentUser);
  const updateProfile = usePortalStore((s) => s.updateProfile);

  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone);
  const [bio, setBio] = useState(currentUser.bio);
  const [location, setLocation] = useState(currentUser.location);
  const [newSkill, setNewSkill] = useState('');
  const [skills, setSkills] = useState<string[]>(currentUser.skills);
  const [emName, setEmName] = useState(currentUser.emergencyContact.name);
  const [emPhone, setEmPhone] = useState(currentUser.emergencyContact.phone);
  const [emRel, setEmRel] = useState(currentUser.emergencyContact.relationship);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name,
      email,
      phone,
      bio,
      location,
      skills,
      emergencyContact: {
        name: emName,
        phone: emPhone,
        relationship: emRel,
      },
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="size-16 rounded-full border-2 border-rose-500 object-cover shadow"
          />
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Profile Management</h3>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                {currentUser.role}
              </span>
              <span className="text-xs text-slate-400">Joined {currentUser.joinedDate}</span>
            </div>
          </div>
        </div>

        {savedSuccess && (
          <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-center text-sm font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            ✓ Profile changes saved successfully!
          </div>
        )}

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-rose-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-rose-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-rose-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Location (City, State)</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-rose-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Bio &amp; Goals</label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-rose-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Skills Management */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Skills &amp; Expertise (Used for AI Job Matching)
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                placeholder="Add skill (e.g., Python, Negotiation, Financial Modeling)..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-rose-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="rounded-xl bg-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
              >
                Add
              </button>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 dark:border-rose-950/60 dark:bg-rose-950/20">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase text-rose-700 dark:text-rose-400">
              <Shield className="size-4" /> Primary Emergency Contact (SOS)
            </h4>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">Contact Name</label>
                <input
                  type="text"
                  value={emName}
                  onChange={(e) => setEmName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">Phone</label>
                <input
                  type="text"
                  value={emPhone}
                  onChange={(e) => setEmPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">Relationship</label>
                <input
                  type="text"
                  value={emRel}
                  onChange={(e) => setEmRel(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:from-rose-600 hover:to-pink-700"
            >
              <Save className="size-4" /> Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
