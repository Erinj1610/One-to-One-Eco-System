import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../api_config';
import { 
  Calendar as CalendarIcon, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Info, 
  User as UserIcon,
  Layers,
  Heart,
  Smile,
  Activity,
  Award,
  ChevronDown,
  MessageSquare
} from 'lucide-react';

const deptColor = { Modus: 'b-info', Molecule: 'b-success', Admin: 'b-default', Mood: 'b-warning' };

export default function HrPage() {
  const { user } = useAuth();
  
  // Data states
  const [employees, setEmployees] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  
  // Wellbeing check-in & assessment states
  const [selfAssessments, setSelfAssessments] = useState([]);
  const [managerCheckins, setManagerCheckins] = useState([]);
  const [submittingCheckin, setSubmittingCheckin] = useState(false);
  
  // Personal check-in form states
  const [selfForm, setSelfForm] = useState({
    happiness: 4,
    workloadFeeling: 3,
    busyness: 'Normal',
    notes: ''
  });
  const [selfSuccess, setSelfSuccess] = useState(null);
  
  // Manager check-in form states
  const [mgrForm, setMgrForm] = useState({
    sentiment: 'Healthy',
    workloadRating: 3,
    notes: ''
  });

  const [loading, setLoading] = useState(true);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [error, setError] = useState(null);

  // Calendar states
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Form states
  const [bookingForm, setBookingForm] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookingError, setBookingError] = useState(null);

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch employees (includes their latest wellbeing rating)
      const empRes = await fetch(`${API_BASE}/api/hr/employees`);
      const empData = await empRes.json();
      setEmployees(empData);

      // 2. Fetch leave requests
      const lrRes = await fetch(`${API_BASE}/api/hr/leave-requests`);
      const lrData = await lrRes.json();
      setLeaveRequests(lrData);

      // 3. Fetch leave types
      const ltRes = await fetch(`${API_BASE}/api/hr/leave-types`);
      const ltData = await ltRes.json();
      setLeaveTypes(ltData);
      if (ltData.length > 0 && !bookingForm.leaveTypeId) {
        setBookingForm(prev => ({ ...prev, leaveTypeId: ltData[0].id.toString() }));
      }

      // 4. Fetch current employee balance by email
      if (user && user.email) {
        const myRes = await fetch(`${API_BASE}/api/hr/employee-by-email/${user.email}`);
        if (myRes.ok) {
          const myData = await myRes.json();
          setCurrentEmployee(myData);
        }
      }

    } catch (err) {
      console.error(err);
      setError("Failed to load HR data from backend server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Load employee wellbeing history details when selected
  useEffect(() => {
    if (selectedStaff) {
      // Fetch self assessments
      fetch(`${API_BASE}/api/hr/self-assessments/${selectedStaff.id}`)
        .then(res => res.json())
        .then(data => setSelfAssessments(data))
        .catch(err => console.error("Error loading self-assessments:", err));

      // Fetch manager logged checkins
      fetch(`${API_BASE}/api/hr/wellbeing-checkins/${selectedStaff.id}`)
        .then(res => res.json())
        .then(data => setManagerCheckins(data))
        .catch(err => console.error("Error loading manager check-ins:", err));
    } else {
      setSelfAssessments([]);
      setManagerCheckins([]);
    }
  }, [selectedStaff]);

  // Calendar logic helpers
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getLeaveForDate = (dateStr) => {
    return leaveRequests.filter(req => {
      if (req.status === 'Rejected') return false;
      return dateStr >= req.start_date && dateStr <= req.end_date;
    });
  };

  const handleDayClick = (day) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;

    setBookingForm(prev => ({
      ...prev,
      startDate: dateStr,
      endDate: dateStr
    }));
    setBookingSuccess(null);
    setBookingError(null);
  };

  // Submit self check-in rating
  const handleSelfCheckinSubmit = async (e) => {
    e.preventDefault();
    if (!currentEmployee) return;

    try {
      const res = await fetch(`${API_BASE}/api/hr/self-assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: currentEmployee.id,
          happiness: selfForm.happiness,
          workload_feeling: selfForm.workloadFeeling,
          busyness: selfForm.busyness,
          notes: selfForm.notes || null
        })
      });

      if (res.ok) {
        setSelfSuccess("Self-checkin submitted successfully!");
        setSelfForm(prev => ({ ...prev, notes: '' }));
        fetchData();
        setTimeout(() => setSelfSuccess(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit manager review
  const handleManagerCheckinSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStaff || !currentEmployee) return;

    setSubmittingCheckin(true);
    try {
      const res = await fetch(`${API_BASE}/api/hr/wellbeing-checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: selectedStaff.id,
          manager_id: currentEmployee.id,
          sentiment: mgrForm.sentiment,
          workload_rating: parseInt(mgrForm.workloadRating),
          notes: mgrForm.notes || null
        })
      });

      if (res.ok) {
        setMgrForm(prev => ({ ...prev, notes: '' }));
        // Refresh manager checkins list
        const cRes = await fetch(`${API_BASE}/api/hr/wellbeing-checkins/${selectedStaff.id}`);
        const cData = await cRes.json();
        setManagerCheckins(cData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingCheckin(false);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingError(null);
    setBookingSuccess(null);

    if (!currentEmployee) {
      setBookingError("No employee profile matches your login email.");
      return;
    }

    setSubmittingLeave(true);
    try {
      const res = await fetch(`${API_BASE}/api/hr/leave-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: currentEmployee.id,
          leave_type_id: parseInt(bookingForm.leaveTypeId),
          start_date: bookingForm.startDate,
          end_date: bookingForm.endDate,
          reason: bookingForm.reason || null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to submit leave request.");
      }

      setBookingSuccess("Leave request submitted successfully!");
      setBookingForm(prev => ({ ...prev, startDate: '', endDate: '', reason: '' }));
      fetchData();
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleStatusUpdate = async (reqId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/hr/leave-requests/${reqId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      alert("Error contacting server.");
    }
  };

  if (loading && employees.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading HR System…</div>;
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const totalDays = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  // Colors mapping for busyness
  const busynessBadgeColor = {
    'Underloaded': 'b-success',
    'Normal': 'b-info',
    'Busy': 'b-warning',
    'Overloaded': 'b-danger'
  };

  return (
    <div className="animation-fade-in" style={{ paddingBottom: '40px' }}>
      
      {/* SECTION 1: MASTER STAFF DIRECTORY & WELLBEING MONITOR */}
      <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Smile size={18} color="var(--text-info)" />
        Staff Directory & Wellbeing Monitor
      </div>
      
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body" style={{ padding: 0 }}>
          <table className="table" style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Role & Department</th>
                <th>Manager</th>
                <th style={{ textAlign: 'center' }}>Happiness (1-5)</th>
                <th style={{ textAlign: 'center' }}>Workload (1-5)</th>
                <th style={{ textAlign: 'center' }}>Busyness Level</th>
                <th style={{ textAlign: 'center' }}>Leave Balance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const annualBal = emp.leave_balances?.find(b => b.type_name === 'Annual');
                const wb = emp.wellbeing || { happiness: 3, workload: 3, busyness: 'Normal' };
                
                // Happiness indicator emoji
                const happinessEmoji = wb.happiness >= 4.5 ? '😄' : wb.happiness >= 3.5 ? '🙂' : wb.happiness >= 2.5 ? '😐' : '😟';
                
                return (
                  <tr 
                    key={emp.id} 
                    style={{ 
                      background: selectedStaff?.id === emp.id ? 'var(--bg-secondary)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                    onClick={() => setSelectedStaff(emp)}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="av" style={{ width: '30px', height: '30px', background: 'var(--border-info)', color: 'var(--text-info)', fontSize: '11px', fontWeight: 'bold' }}>
                          {emp.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Start Date: {emp.start_date}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{emp.role}</div>
                      <span className={`badge ${deptColor[emp.department] || 'b-default'}`}>{emp.department}</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{emp.manager_name || 'None'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '14px', marginRight: '4px' }}>{happinessEmoji}</span>
                      <strong style={{ fontSize: '13px' }}>{wb.happiness} / 5</strong>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', width: '80px' }}>
                        <div style={{ display: 'flex', gap: '2px', width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <div 
                              key={idx} 
                              style={{ 
                                flex: 1, 
                                background: idx < wb.workload 
                                  ? (wb.workload >= 4.5 ? 'var(--text-danger)' : wb.workload >= 3.5 ? 'var(--text-warning)' : 'var(--text-success)') 
                                  : 'transparent' 
                              }} 
                            />
                          ))}
                        </div>
                        <span style={{ fontSize: '9.5px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{wb.workload} / 5</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${busynessBadgeColor[wb.busyness] || 'b-default'}`}>
                        {wb.busyness}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: '500' }}>
                      {annualBal ? `${annualBal.remaining} days` : 'N/A'}
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline" style={{ fontSize: '11px', padding: '4px 8px' }}>
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* STAFF DETAIL PROFILE VIEW / DRAWER */}
      {selectedStaff && (
        <div className="card" style={{ marginBottom: '24px', border: '1.5px solid var(--border-info)' }}>
          <div className="card-head" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserIcon size={18} color="var(--text-info)" />
              Wellbeing & Profile Details: {selectedStaff.name}
            </div>
            <button className="btn btn-sm" onClick={() => setSelectedStaff(null)}>✕ Close Details</button>
          </div>
          
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr', gap: '20px', padding: '20px 15px' }}>
            
            {/* Left Col: Leave request history, balances, metadata */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={15} /> Personal Leaves & Metadata
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Department</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{selectedStaff.department}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Manager</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{selectedStaff.manager_name || 'None'}</div>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>Leave Balances</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedStaff.leave_balances?.map(bal => (
                    <div key={bal.type_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: '4px' }}>
                      <span style={{ fontWeight: 500 }}>{bal.type_name} Leave</span>
                      <span style={{ color: 'var(--text-info)', fontWeight: 600 }}>{bal.remaining}d remaining (Taken: {bal.taken}d)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Log manager check-in note */}
              <form onSubmit={handleManagerCheckinSubmit} style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 600 }}>Record 1-on-1 Check-in</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div className="form-row">
                    <label className="form-label" style={{ fontSize: '10px' }}>Sentiment State</label>
                    <select 
                      className="form-control"
                      value={mgrForm.sentiment}
                      onChange={e => setMgrForm(prev => ({ ...prev, sentiment: e.target.value }))}
                      style={{ height: '28px', padding: '2px 6px', fontSize: '11px' }}
                    >
                      <option value="Healthy">Healthy</option>
                      <option value="Stressed">Stressed</option>
                      <option value="Burnout Risk">Burnout Risk</option>
                    </select>
                  </div>
                  
                  <div className="form-row">
                    <label className="form-label" style={{ fontSize: '10px' }}>Workload Scale</label>
                    <select 
                      className="form-control"
                      value={mgrForm.workloadRating}
                      onChange={e => setMgrForm(prev => ({ ...prev, workloadRating: parseInt(e.target.value) }))}
                      style={{ height: '28px', padding: '2px 6px', fontSize: '11px' }}
                    >
                      <option value="1">1 - Underloaded</option>
                      <option value="2">2 - Light</option>
                      <option value="3">3 - Normal</option>
                      <option value="4">4 - Busy</option>
                      <option value="5">5 - Overloaded</option>
                    </select>
                  </div>
                </div>

                <div className="form-row" style={{ marginBottom: '10px' }}>
                  <label className="form-label" style={{ fontSize: '10px' }}>Notes</label>
                  <textarea 
                    className="form-control"
                    rows={2}
                    placeholder="Log session notes..."
                    value={mgrForm.notes}
                    onChange={e => setMgrForm(prev => ({ ...prev, notes: e.target.value }))}
                    style={{ resize: 'none', fontSize: '11.5px', padding: '6px' }}
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-sm" disabled={submittingCheckin}>
                  Save Check-in Note
                </button>
              </form>
            </div>

            {/* Right Col: Self-Assessments Timeline & Logs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h4 style={{ margin: '0', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={15} /> Employee Self-Checkins & Happiness History
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '350px', paddingRight: '4px' }}>
                {selfAssessments.length === 0 ? (
                  <div style={{ fontStyle: 'italic', fontSize: '11.5px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px' }}>
                    No check-ins submitted yet by {selectedStaff.name}.
                  </div>
                ) : (
                  selfAssessments.map(assess => (
                    <div key={assess.id} style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px', background: 'var(--bg-secondary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 'bold' }}>{assess.date}</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span className="badge b-info">Happiness: {assess.happiness}/5</span>
                          <span className={`badge ${busynessBadgeColor[assess.busyness] || 'b-default'}`}>{assess.busyness}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {assess.notes || 'No details provided.'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* DUAL WORKSPACE PANEL: CALENDAR & LEAVE REQUESTS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px', marginBottom: '24px' }}>
        
        {/* Left Col: Calendar Dashboard */}
        <div className="card">
          <div className="card-head" style={{ paddingBottom: '10px' }}>
            <div className="card-title" style={{ gap: '8px' }}>
              <CalendarIcon size={18} />
              Team Calendar View
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button className="btn btn-sm" onClick={handlePrevMonth}><ChevronLeft size={16} /></button>
              <span style={{ fontWeight: 600, fontSize: '14px', width: '110px', textAlign: 'center' }}>
                {monthNames[month]} {year}
              </span>
              <button className="btn btn-sm" onClick={handleNextMonth}><ChevronRight size={16} /></button>
            </div>
          </div>

          <div className="card-body" style={{ padding: '15px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '10px' }}>
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {Array.from({ length: firstDayIndex }).map((_, idx) => (
                <div key={`empty-${idx}`} style={{ height: '70px', background: 'transparent' }} />
              ))}

              {Array.from({ length: totalDays }).map((_, idx) => {
                const day = idx + 1;
                const dayStr = String(day).padStart(2, '0');
                const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${dayStr}`;
                const dailyLeaves = getLeaveForDate(dateString);

                return (
                  <div 
                    key={`day-${day}`}
                    onClick={() => handleDayClick(day)}
                    style={{
                      height: '70px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '4px',
                      cursor: 'pointer',
                      background: 'var(--bg-secondary)',
                      position: 'relative',
                      transition: 'border-color 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      overflow: 'hidden'
                    }}
                    className="calendar-cell"
                  >
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: dailyLeaves.length > 0 ? 'var(--text-info)' : 'var(--text-secondary)' }}>
                      {day}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                      {dailyLeaves.slice(0, 2).map(req => (
                        <div 
                          key={req.id} 
                          style={{ 
                            fontSize: '9px', 
                            padding: '2px 4px', 
                            borderRadius: '3px',
                            background: req.status === 'Approved' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            color: req.status === 'Approved' ? 'var(--text-success)' : 'var(--text-warning)',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden'
                          }}
                        >
                          {req.employee_name.split(' ')[0]} ({req.leave_type_name[0]})
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Booking Request & Self Wellbeing Checkin Widget */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Personal Wellbeing Self-Checkin Form */}
          <div className="card" style={{ border: selfSuccess ? '1.5px solid var(--border-success)' : '1px solid var(--border-color)' }}>
            <div className="card-head">
              <div className="card-title" style={{ gap: '8px' }}>
                <Heart size={18} color="var(--text-danger)" />
                My Weekly Wellbeing Check-in
              </div>
            </div>
            <div className="card-body">
              {selfSuccess && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', marginBottom: '12px' }}>
                  {selfSuccess}
                </div>
              )}
              <form onSubmit={handleSelfCheckinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-row">
                    <label className="form-label">Happiness (1-5)</label>
                    <select 
                      className="form-control"
                      value={selfForm.happiness}
                      onChange={e => setSelfForm(prev => ({ ...prev, happiness: parseInt(e.target.value) }))}
                    >
                      <option value="5">5 - Excellent 😄</option>
                      <option value="4">4 - Good 🙂</option>
                      <option value="3">3 - Normal 😐</option>
                      <option value="2">2 - Low 😟</option>
                      <option value="1">1 - Stressed/Burntout 😩</option>
                    </select>
                  </div>
                  
                  <div className="form-row">
                    <label className="form-label">Workload Feeling (1-5)</label>
                    <select 
                      className="form-control"
                      value={selfForm.workloadFeeling}
                      onChange={e => setSelfForm(prev => ({ ...prev, workloadFeeling: parseInt(e.target.value) }))}
                    >
                      <option value="1">1 - Underloaded</option>
                      <option value="2">2 - Light</option>
                      <option value="3">3 - Normal</option>
                      <option value="4">4 - Heavy</option>
                      <option value="5">5 - Overloaded</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Busyness Level</label>
                  <select 
                    className="form-control"
                    value={selfForm.busyness}
                    onChange={e => setSelfForm(prev => ({ ...prev, busyness: e.target.value }))}
                  >
                    <option value="Underloaded">Underloaded / Available</option>
                    <option value="Normal">Normal Workload</option>
                    <option value="Busy">Busy / Active</option>
                    <option value="Overloaded">Overloaded / Bottlenecked</option>
                  </select>
                </div>

                <div className="form-row">
                  <label className="form-label">Optional Comments</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="How are you feeling this week?"
                    value={selfForm.notes}
                    onChange={e => setSelfForm(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>

                <button type="submit" className="btn btn-primary">
                  Submit Self Check-in
                </button>
              </form>
            </div>
          </div>

          {/* Leave Booking Form */}
          <div className="card">
            <div className="card-head"><div className="card-title">Book Leave Request</div></div>
            <div className="card-body">
              {bookingSuccess && <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', padding: '8px', borderRadius: '6px', fontSize: '12px', marginBottom: '10px' }}>{bookingSuccess}</div>}
              {bookingError && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '8px', borderRadius: '6px', fontSize: '12px', marginBottom: '10px' }}>{bookingError}</div>}
              <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="form-row">
                  <label className="form-label">Leave Type</label>
                  <select className="form-control" value={bookingForm.leaveTypeId} onChange={e => setBookingForm(prev => ({ ...prev, leaveTypeId: e.target.value }))}>
                    {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-row"><label className="form-label">Start</label><input type="date" className="form-control" value={bookingForm.startDate} onChange={e => setBookingForm(prev => ({ ...prev, startDate: e.target.value }))} required /></div>
                  <div className="form-row"><label className="form-label">End</label><input type="date" className="form-control" value={bookingForm.endDate} onChange={e => setBookingForm(prev => ({ ...prev, endDate: e.target.value }))} required /></div>
                </div>
                <div className="form-row"><label className="form-label">Reason</label><input type="text" className="form-control" placeholder="Reason (optional)" value={bookingForm.reason} onChange={e => setBookingForm(prev => ({ ...prev, reason: e.target.value }))} /></div>
                <button type="submit" className="btn btn-primary">Submit Request</button>
              </form>
            </div>
          </div>

        </div>

      </div>

      {/* LEAVE REQUESTS TABLE (Approve/Reject Queue) */}
      <div className="section-label">Leave Approvals & History Queue</div>
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <table className="table" style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>From Date</th>
                <th>To Date</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                    No leave requests logged in system.
                  </td>
                </tr>
              ) : (
                leaveRequests.map(lr => (
                  <tr key={lr.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lr.employee_name}</td>
                    <td>{lr.leave_type_name}</td>
                    <td>{lr.start_date}</td>
                    <td>{lr.end_date}</td>
                    <td>
                      <span className={`badge ${lr.status === 'Approved' ? 'b-success' : lr.status === 'Rejected' ? 'b-danger' : 'b-warning'}`}>
                        {lr.status}
                      </span>
                    </td>
                    <td>{lr.reason || '-'}</td>
                    <td>
                      {lr.status === 'Pending' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn btn-sm" 
                            style={{ color: 'var(--text-success)', borderColor: 'var(--border-success)', background: 'transparent' }}
                            onClick={() => handleStatusUpdate(lr.id, 'Approved')}
                          >
                            Approve
                          </button>
                          <button 
                            className="btn btn-sm btn-danger" 
                            style={{ background: 'var(--btn-danger-bg)' }}
                            onClick={() => handleStatusUpdate(lr.id, 'Rejected')}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
