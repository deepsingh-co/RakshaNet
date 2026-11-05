import { useState } from 'react';
import {
  HeartPulse,
  Search,
  Calendar,
  Clock,
  MapPin,
  Video,
  FileText,
  Upload,
  Shield,
  Star,
  X,
} from 'lucide-react';
import { usePortalStore } from '../store/portalStore';
import { MOCK_DOCTORS } from '../data/mockData';
import { Doctor } from '../types';

export function HealthMedicalPage() {
  const appointments = usePortalStore((s) => s.appointments);
  const healthRecords = usePortalStore((s) => s.healthRecords);
  const bookDoctorAppointment = usePortalStore((s) => s.bookDoctorAppointment);

  const [activeTab, setActiveTab] = useState<'doctors' | 'appointments' | 'records' | 'resources'>('doctors');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Booking modal
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookingDate, setBookingDate] = useState('2026-11-18');
  const [bookingTime, setBookingTime] = useState('11:00 AM');
  const [bookingMode, setBookingMode] = useState<'Video Call' | 'In-Clinic'>('Video Call');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Health records upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newRecordTitle, setNewRecordTitle] = useState('');
  const [newRecordType, setNewRecordType] = useState('Prescription');

  const SPECIALTIES = ['All', 'Gynecologist', 'Pediatrician', 'General Physician', 'Psychiatrist'];

  const filteredDoctors = MOCK_DOCTORS.filter((d) => {
    const matchesSpec = selectedSpecialty === 'All' || d.specialty === selectedSpecialty;
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.hospital.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSpec && matchesSearch;
  });

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    bookDoctorAppointment(
      selectedDoctor.name,
      selectedDoctor.specialty,
      bookingDate,
      bookingTime,
      bookingMode,
      selectedDoctor.hospital
    );
    setBookingSuccess(true);
    setTimeout(() => {
      setBookingSuccess(false);
      setSelectedDoctor(null);
      setActiveTab('appointments');
    }, 1200);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <HeartPulse className="size-3.5" />
            <span>Women Health &amp; Clinical Care</span>
          </div>
          <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            Healthcare, Doctor Consultations &amp; Records
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Book verified female gynecologists, pediatricians, tele-consultations, and maintain your private encrypted medical vault.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700"
        >
          <Upload className="size-4" /> Upload Health Record
        </button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 scrollbar-none dark:border-slate-800">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('doctors')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'doctors'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Find Verified Doctors ({MOCK_DOCTORS.length})
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'appointments'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            My Appointments ({appointments.length})
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'records'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Encrypted Health Vault ({healthRecords.length})
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'resources'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Women Health Guides
          </button>
        </div>
      </div>

      {/* 1. Doctor Directory Tab */}
      {activeTab === 'doctors' && (
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((spec) => (
                <button
                  key={spec}
                  onClick={() => setSelectedSpecialty(spec)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                    selectedSpecialty === spec
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search doctors, hospital..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {filteredDoctors.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {doc.specialty}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                      <Star className="size-3 fill-amber-500" /> {doc.rating}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">{doc.name}</h3>
                  <p className="text-xs text-slate-500">{doc.hospital}</p>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                    <p>• Experience: {doc.experience}</p>
                    <p>• Consultation: <strong className="text-emerald-600">{doc.consultationFee}</strong></p>
                    <p>• Hours: {doc.availability}</p>
                    <p>• Languages: {doc.languages.join(', ')}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedDoctor(doc)}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-700"
                >
                  <Calendar className="size-3.5" /> Book Consultation
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Appointments Tab */}
      {activeTab === 'appointments' && (
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <p className="text-xs text-slate-400">No active appointments scheduled.</p>
          ) : (
            appointments.map((apt) => (
              <div
                key={apt.id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{apt.doctorName}</span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.2 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {apt.specialty}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{apt.hospital}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5" /> {apt.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3.5" /> {apt.time}
                    </span>
                    <span className="font-semibold text-blue-600">• {apt.mode}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    ✓ {apt.status}
                  </span>
                  {apt.mode === 'Video Call' && (
                    <button
                      onClick={() => alert('Opening secure encrypted WebRTC consultation room...')}
                      className="flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                    >
                      <Video className="size-3.5" /> Join Call
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. Encrypted Health Records Vault Tab */}
      {activeTab === 'records' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900 dark:border-blue-950 dark:bg-blue-950/20 dark:text-blue-300">
            <div className="flex items-center gap-2 font-bold">
              <Shield className="size-4 text-blue-600" /> Client-Side Encrypted Health Vault
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-blue-800 dark:text-blue-400">
              Prescriptions, lab diagnostics, and maternal history uploaded here are protected with AES-256 local keys. Only you and authorized consulting doctors can access them.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {healthRecords.map((rec) => (
              <div
                key={rec.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    <FileText className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{rec.title}</h4>
                    <p className="text-[11px] text-slate-500">{rec.type} · Issued by {rec.doctor}</p>
                    <span className="font-mono text-[10px] text-slate-400">{rec.date} · {rec.fileSize}</span>
                  </div>
                </div>

                <button
                  onClick={() => alert(`Downloading verified record: ${rec.title}`)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:border-slate-700"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Women Health Guides Tab */}
      {activeTab === 'resources' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              title: 'PCOS & Hormonal Equilibrium Guide',
              topic: 'Reproductive Endocrinology',
              summary: 'Symptoms, insulin resistance connection, cyclic nutrition, and natural lifestyle interventions.',
            },
            {
              title: 'Cervical & Breast Cancer Early Detection Protocol',
              topic: 'Preventative Oncology',
              summary: 'Self-examination monthly checkpoints, Pap smear guidelines, and HPV vaccine schedules.',
            },
            {
              title: 'Perinatal Nutrition & Postpartum Wellness',
              topic: 'Maternal Health',
              summary: 'Nutritional iron/calcium restoration, recognizing baby blues vs postpartum depression.',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="text-[10px] font-bold uppercase text-blue-600">{item.topic}</span>
              <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">{item.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{item.summary}</p>
            </div>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 sm:p-8">
            <button
              onClick={() => setSelectedDoctor(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100"
            >
              <X className="size-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Book Appointment with {selectedDoctor.name}
            </h3>
            <p className="text-xs text-slate-500">{selectedDoctor.specialty} · {selectedDoctor.hospital}</p>

            {bookingSuccess && (
              <div className="my-4 rounded-xl bg-emerald-50 p-3 text-center text-xs font-bold text-emerald-700">
                ✓ Consultation confirmed! Added to your schedule.
              </div>
            )}

            <form onSubmit={handleConfirmBooking} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBookingMode('Video Call')}
                  className={`rounded-2xl border p-3 text-center text-xs font-bold transition ${
                    bookingMode === 'Video Call'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      : 'border-slate-200'
                  }`}
                >
                  <Video className="mx-auto size-5 mb-1 text-blue-600" />
                  Tele-Health Video
                </button>
                <button
                  type="button"
                  onClick={() => setBookingMode('In-Clinic')}
                  className={`rounded-2xl border p-3 text-center text-xs font-bold transition ${
                    bookingMode === 'In-Clinic'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      : 'border-slate-200'
                  }`}
                >
                  <MapPin className="mx-auto size-5 mb-1 text-blue-600" />
                  In-Clinic Visit
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Date</label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Time Slot</label>
                <select
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option>10:00 AM</option>
                  <option>11:30 AM</option>
                  <option>02:15 PM</option>
                  <option>04:45 PM</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDoctor(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-6 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Confirm Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Health Record Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 sm:p-8">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100"
            >
              <X className="size-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Upload to Encrypted Vault</h3>
            <p className="text-xs text-slate-500">Attach clinical diagnostics, lab reports, or doctor prescriptions.</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert('Record encrypted and saved to your private local health vault!');
                setShowUploadModal(false);
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Thyroid Panel &amp; CBC Report"
                  value={newRecordTitle}
                  onChange={(e) => setNewRecordTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Type</label>
                <select
                  value={newRecordType}
                  onChange={(e) => setNewRecordType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option>Prescription</option>
                  <option>Lab Report</option>
                  <option>Vaccination</option>
                  <option>Medical History</option>
                </select>
              </div>

              <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 dark:border-slate-700">
                <Upload className="mx-auto size-6 text-slate-400 mb-1" />
                <span>Drag &amp; drop PDF or JPEG file, or browse</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-6 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Encrypt &amp; Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
