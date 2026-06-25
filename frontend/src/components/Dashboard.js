import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import BASE_URL from "../config";

// ─── Toast Notification Component ────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: { bg: "linear-gradient(135deg, #10b981, #059669)", icon: "✓" },
    error:   { bg: "linear-gradient(135deg, #ef4444, #dc2626)", icon: "✕" },
    info:    { bg: "linear-gradient(135deg, #3b82f6, #2563eb)", icon: "ℹ" },
  };
  const c = colors[type] || colors.info;

  return (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 9999,
      background: c.bg, color: "#fff", padding: "14px 24px",
      borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      display: "flex", alignItems: "center", gap: 12,
      animation: "slideIn 0.4s ease", minWidth: 280, maxWidth: 420,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <span style={{ fontSize: 18, fontWeight: 700, width: 28, height: 28,
        borderRadius: "50%", background: "rgba(255,255,255,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>{c.icon}</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{message}</span>
      <button onClick={onClose} style={{
        background: "none", border: "none", color: "#fff",
        cursor: "pointer", fontSize: 18, opacity: 0.7, padding: 0,
      }}>×</button>
    </div>
  );
}

function Dashboard() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [newUser, setNewUser] = useState({ name: "", email: "", form_url: "", department_id: "" });

  // ─── Batch State ────────────────────────────────────────────────────
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [newDept, setNewDept] = useState({ department_name: "" });

  const [filterReviewer, setFilterReviewer] = useState("");
  const [filterReviewee, setFilterReviewee] = useState("");
  const [assignmentsPerUser, setAssignmentsPerUser] = useState(4);
  const [roundNumber, setRoundNumber] = useState(1);
  const [isBatchSending, setIsBatchSending] = useState(false);

  const [activeTab, setActiveTab] = useState("Welcome");
  const [currentTime, setCurrentTime] = useState(new Date());

  // ─── Manual Assign State ───────────────────────────────────────────
  const [manualReviewer, setManualReviewer] = useState([]);
  const [manualReviewee, setManualAssignees] = useState([]);
  const [manualStep, setManualStep] = useState(1);
  const [Reviewerearch, setReviewerearch] = useState("");
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [isSending, setIsSending] = useState(false);

  // ─── Toast State ────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // 🔹 Load initial data
  // ================= API CALLS =================

  const fetchUsers = useCallback(async () => {
    const res = await axios.get(`${BASE_URL}/users/`);
    setUsers(res.data);
  }, []);

  const fetchDepartments = useCallback(async () => {
    const res = await axios.get(`${BASE_URL}/departments/`);
    setDepartments(res.data);
  }, []);

  const fetchAssignments = useCallback(async (batchId) => {
    try {
      const url = batchId
        ? `${BASE_URL}/assignments/?batch_id=${batchId}`
        : `${BASE_URL}/assignments/`;
      const res = await axios.get(url);
      setAssignments(res.data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const fetchBatches = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/assignment-batches/`);
      setBatches(res.data);
      // Auto-select latest batch
      if (res.data.length > 0) {
        const latestId = res.data[0].id;
        setSelectedBatchId(latestId);
        fetchAssignments(latestId);
      } else {
        fetchAssignments();
      }
    } catch (error) {
      console.error(error);
      fetchAssignments();
    }
  }, [fetchAssignments]);

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
    fetchBatches();
  }, [fetchUsers, fetchDepartments, fetchBatches]);

  const handleBatchChange = (batchId) => {
    setSelectedBatchId(batchId);
    if (batchId) {
      fetchAssignments(batchId);
    } else {
      fetchAssignments();
    }
  };

  const assignReviews = async () => {
    try {
      const res = await axios.post(`${BASE_URL}/assign-reviews/?num=${assignmentsPerUser}&round_num=${roundNumber}`);
      showToast("Assignments generated. Review the list before sending emails.", "success");
      // Auto-select the newly created batch
      const newBatchId = res.data.batch_id;
      await fetchBatches();
      if (newBatchId) {
        setSelectedBatchId(newBatchId);
        fetchAssignments(newBatchId);
      }
    } catch (error) {
      console.error(error);
      showToast("Failed to generate assignments", "error");
    }
  };

  const sendBatchEmails = async () => {
    if (!selectedBatchId) {
      showToast("Select a batch before sending emails", "error");
      return;
    }

    setIsBatchSending(true);
    try {
      const res = await axios.post(`${BASE_URL}/assignment-batches/${selectedBatchId}/send-emails`);
      showToast(
        `${res.data.emails_sent} emails sent, ${res.data.emails_failed} failed`,
        res.data.emails_failed ? "info" : "success"
      );
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.detail || "Failed to send assignment emails", "error");
    } finally {
      setIsBatchSending(false);
    }
  };

  // ================= CREATE =================

  const createUser = async () => {
    await axios.post(`${BASE_URL}/users/`, null, { params: newUser });
    fetchUsers();
    setNewUser({ name: "", email: "", form_url: "", department_id: "" });
    showToast("User created successfully!", "success");
  };

  const createDepartment = async () => {
    await axios.post(`${BASE_URL}/departments/`, null, { params: { name: newDept.department_name } });
    fetchDepartments();
    setNewDept({ department_name: "" });
    showToast("Department created successfully!", "success");
  };

  // ================= DELETE =================

  const deleteUser = async (id) => {
    await axios.delete(`${BASE_URL}/users/${id}`);
    fetchUsers();
    showToast("User deleted", "info");
  };

  const deleteDepartment = async (id) => {
    await axios.delete(`${BASE_URL}/departments/${id}`);
    fetchDepartments();
    showToast("Department deleted", "info");
  };

  // ================= MANUAL ASSIGN =================

  const toggleRecipient = (userId) => {
    setManualReviewer(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleAssignee = (userId) => {
    setManualAssignees(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllReviewer = () => {
    const filtered = users.filter(u =>
      u.name.toLowerCase().includes(Reviewerearch.toLowerCase())
    );
    const allSelected = filtered.every(u => manualReviewer.includes(u.user_id));
    if (allSelected) {
      setManualReviewer(prev => prev.filter(id => !filtered.find(u => u.user_id === id)));
    } else {
      setManualReviewer(prev => [...new Set([...prev, ...filtered.map(u => u.user_id)])]);
    }
  };

  const selectAllAssignees = () => {
    const filtered = users.filter(u =>
      u.name.toLowerCase().includes(assigneeSearch.toLowerCase())
    );
    const allSelected = filtered.every(u => manualReviewee.includes(u.user_id));
    if (allSelected) {
      setManualAssignees(prev => prev.filter(id => !filtered.find(u => u.user_id === id)));
    } else {
      setManualAssignees(prev => [...new Set([...prev, ...filtered.map(u => u.user_id)])]);
    }
  };

  const sendManualAssignment = async () => {
    if (manualReviewer.length === 0 || manualReviewee.length === 0) {
      showToast("Please select at least one reviewer and one reviewee", "error");
      return;
    }

    setIsSending(true);
    try {
      const res = await axios.post(`${BASE_URL}/manual-assign/`, {
        reviewer_ids: manualReviewer,
        reviewee_ids: manualReviewee,
      });
      showToast(
        `${res.data.assignments_created} assignments created, ${res.data.emails_sent} emails sent!`,
        "success"
      );
      fetchAssignments();
      // Reset
      setManualReviewer([]);
      setManualAssignees([]);
      setManualStep(1);
    } catch (error) {
      console.error(error);
      showToast("Failed to send manual assignments", "error");
    } finally {
      setIsSending(false);
    }
  };


  // ================= HELPERS =================
  const getUserName = (id) => {
    const user = users.find(u => u.user_id === id);
    return user ? user.name : `User ${id}`;
  };

  const getUserDepartmentName = (id) => {
    const user = users.find(u => u.user_id === id);
    if (!user) return "";
    const dept = departments.find(d => String(d.department_id) === String(user.department_id));
    return dept ? dept.department_name : "N/A";
  };

  const getUserEmail = (id) => {
    const user = users.find(u => u.user_id === id);
    return user ? user.email : "";
  };

  const filteredAssignments = assignments.filter(a => {
    let match = true;
    if (filterReviewer && String(a.reviewer_id) !== String(filterReviewer)) match = false;
    if (filterReviewee && String(a.reviewee_id) !== String(filterReviewee)) match = false;
    return match;
  });

  // ================= UI =================

  const sidebarItems = [
    { key: "Dashboard", icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg>
    )},
    { key: "Organization", label: "Users & Departments", icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    )},
    { key: "Assign Reviews", icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
    )},
    { key: "Manual Assign", icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
    )},
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f0f4f8", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* Global Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes slideIn { from { transform: translateX(80px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .card-hover { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0,0,0,0.1) !important; }
        .btn-primary { transition: all 0.2s ease; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(18, 121, 147, 0.35); }
        .btn-primary:active { transform: translateY(0); }
        .check-item { transition: all 0.2s ease; cursor: pointer; }
        .check-item:hover { background: #f0f9fb !important; }
        input:focus, select:focus { border-color: #127993 !important; box-shadow: 0 0 0 3px rgba(18,121,147,0.12) !important; }
      `}</style>

      {/* 🔥 SIDEBAR */}
      <div style={{
        width: 260, background: "linear-gradient(180deg, #127993 0%, #0d5f72 50%, #0a4a59 100%)",
        color: "#fff", padding: "0", display: "flex", flexDirection: "column",
        boxShadow: "4px 0 24px rgba(0,0,0,0.12)",
      }}>
        <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <img style={{ width: "85%", filter: "brightness(1.1)" }} src="/logo_1.png" alt="MTI Logo" />
        </div>

        <nav style={{ padding: "16px 12px", flex: 1 }}>
          {sidebarItems.map(item => {
            const isActive = activeTab === item.key || (item.key === "Organization" && (activeTab === "Users" || activeTab === "Departments"));
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 16px", marginBottom: 4, borderRadius: 10,
                  background: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                  color: "#fff", border: "none", cursor: "pointer",
                  fontSize: 14, fontWeight: isActive ? 600 : 500, textAlign: "left",
                  transition: "all 0.2s ease",
                  backdropFilter: isActive ? "blur(8px)" : "none",
                }}
                onMouseEnter={e => { if (!isActive) e.target.style.background = "rgba(255,255,255,0.08)"; }}
                onMouseLeave={e => { if (!isActive) e.target.style.background = "transparent"; }}
              >
                {item.icon}
                {item.label || item.key}
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 11, color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
          MTI Admin Panel v1.0
        </div>
      </div>

      {/* 🔥 MAIN CONTENT */}
      <div style={{ flex: 1, padding: "28px 36px", overflowY: "auto" }}>

        {/* 🔹 HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1a202c", margin: 0 }}>Admin Dashboard</h1>
            <p style={{ color: "#718096", fontSize: 13, marginTop: 4 }}>{currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div style={{
            background: "linear-gradient(135deg, #127993, #0f6075)", color: "#fff",
            padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
            boxShadow: "0 4px 16px rgba(18,121,147,0.2)",
          }}>
            {currentTime.toLocaleTimeString()}
          </div>
        </div>

        {/* Toast */}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        {/* ─────── WELCOME ─────── */}
        {activeTab === 'Welcome' && (
          <div style={{ animation: "fadeUp 0.5s ease" }}>
            <div className="card-hover" style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              minHeight: 300, background: "linear-gradient(135deg, #ffffff 0%, #f0f9fb 100%)",
              borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.06)", padding: 48,
              textAlign: "center", border: "1px solid rgba(18,121,147,0.08)",
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "linear-gradient(135deg, #127993, #0f6075)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 20, boxShadow: "0 8px 24px rgba(18,121,147,0.25)",
              }}>
                <span style={{ fontSize: 32 }}>👋</span>
              </div>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: "#1a202c", marginBottom: 8 }}>{getGreeting()}, Admin!</h2>
              <p style={{ fontSize: 16, color: "#718096", maxWidth: 400 }}>Select an option from the navigation menu to get started.</p>

              <div style={{ display: "flex", gap: 16, marginTop: 32, flexWrap: "wrap", justifyContent: "center" }}>
                {[
                  { label: "Users", count: users.length, color: "#127993" },
                  { label: "Departments", count: departments.length, color: "#0d8f6e" },
                  { label: "Assignments", count: assignments.length, color: "#e97f0d" },
                ].map(s => (
                  <div key={s.label} style={{
                    background: "#fff", borderRadius: 12, padding: "16px 24px",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.05)", minWidth: 110,
                    border: "1px solid #e8ecf0",
                  }}>
                    <p style={{ fontSize: 28, fontWeight: 800, color: s.color, margin: 0 }}>{s.count}</p>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#a0aec0", margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─────── DASHBOARD STATS ─────── */}
        {activeTab === 'Dashboard' && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, animation: "fadeUp 0.4s ease" }}>
            {[
              { label: "Total Users", count: users.length, color: "#127993", gradient: "linear-gradient(135deg, #e6f7fb, #d0effa)", icon: "👥" },
              { label: "Departments", count: departments.length, color: "#0d8f6e", gradient: "linear-gradient(135deg, #e6faf3, #c6f6e0)", icon: "🏢" },
              { label: "Assignments", count: assignments.length, color: "#e97f0d", gradient: "linear-gradient(135deg, #fff7ed, #ffedd5)", icon: "📋" },
            ].map((s, i) => (
              <div key={s.label} className="card-hover" style={{
                background: "#fff", padding: 24, borderRadius: 16,
                boxShadow: "0 2px 12px rgba(0,0,0,0.05)", textAlign: "center",
                border: "1px solid #e8ecf0", animationDelay: `${i * 0.1}s`,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, background: s.gradient,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 12px", fontSize: 22,
                }}>{s.icon}</div>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: "#718096", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</h3>
                <p style={{ fontSize: 36, fontWeight: 800, color: s.color, margin: 0 }}>{s.count}</p>
              </div>
            ))}
          </div>
        )}

        {/* ─────── ORGANIZATION ─────── */}
        {(activeTab === 'Organization' || activeTab === 'Users' || activeTab === 'Departments') && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, animation: "fadeUp 0.4s ease" }}>
            
            {/* 🔹 USERS MANAGEMENT */}
            <div className="card-hover" style={{ background: "#fff", padding: 24, borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", border: "1px solid #e8ecf0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "2px solid #f0f4f8" }}>
                <h2 style={{ color: "#127993", fontSize: 17, fontWeight: 700, margin: 0 }}>Manage Users</h2>
                <span style={{ background: "linear-gradient(135deg, #e6f7fb, #d0effa)", color: "#127993", fontSize: 12, padding: "6px 14px", borderRadius: 20, fontWeight: 700 }}>{users.length} Users</span>
              </div>
              
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, background: "#f8fafb", padding: 14, borderRadius: 12, border: "1px solid #e8ecf0" }}>
                <input placeholder="Name" value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} style={{ border: "1px solid #e2e8f0", padding: "8px 12px", borderRadius: 8, flex: "1 1 100px", outline: "none", fontSize: 13, transition: "all 0.2s" }} />
                <input placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} style={{ border: "1px solid #e2e8f0", padding: "8px 12px", borderRadius: 8, flex: "1 1 120px", outline: "none", fontSize: 13, transition: "all 0.2s" }} />
                <input placeholder="Employee URL" type="url" value={newUser.form_url} onChange={(e) => setNewUser({...newUser, form_url: e.target.value})} style={{ border: "1px solid #e2e8f0", padding: "8px 12px", borderRadius: 8, flex: "1 1 160px", outline: "none", fontSize: 13, transition: "all 0.2s" }} />
                <select value={newUser.department_id} onChange={(e) => setNewUser({...newUser, department_id: e.target.value})} style={{ border: "1px solid #e2e8f0", padding: "8px 12px", borderRadius: 8, flex: "1 1 120px", outline: "none", fontSize: 13, transition: "all 0.2s", background: "#fff", cursor: "pointer" }}>
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                </select>
                <button onClick={createUser} className="btn-primary" style={{ background: "linear-gradient(135deg, #127993, #0f6075)", color: "#fff", padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" }}>Add User</button>
              </div>

              <div style={{ overflowX: "auto", flex: 1, maxHeight: 500, overflowY: "auto" }}>
                <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafb", borderBottom: "2px solid #e8ecf0" }}>
                      <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 12, color: "#718096", textTransform: "uppercase", letterSpacing: 0.5 }}>ID</th>
                      <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 12, color: "#718096", textTransform: "uppercase", letterSpacing: 0.5 }}>Name</th>
                      <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 12, color: "#718096", textTransform: "uppercase", letterSpacing: 0.5 }}>Form URL</th>
                      <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 12, color: "#718096", textTransform: "uppercase", letterSpacing: 0.5 }}>Dept</th>
                      <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 12, color: "#718096", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length > 0 ? users.map(u => (
                      <tr key={u.user_id} style={{ borderBottom: "1px solid #f0f4f8", transition: "background 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f8fafb"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "10px 14px", fontSize: 12, color: "#a0aec0" }}>{u.user_id}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <p style={{ fontWeight: 600, color: "#1a202c", margin: 0, fontSize: 13 }}>{u.name}</p>
                          <p style={{ fontSize: 11, color: "#a0aec0", margin: 0 }}>{u.email}</p>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          {u.form_url ? (
                            <a href={u.form_url} target="_blank" rel="noopener noreferrer" style={{ color: "#127993", fontSize: 12, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, background: "#e6f7fb", padding: "3px 10px", borderRadius: 6, border: "1px solid #b2e0eb" }}>
                              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              Open
                            </a>
                          ) : (
                            <span style={{ color: "#cbd5e0", fontSize: 11, fontStyle: "italic" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#718096", fontSize: 12 }}>#{u.department_id}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right" }}>
                          <button onClick={() => deleteUser(u.user_id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: 600, fontSize: 12 }}>Delete</button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="6" style={{ padding: 24, textAlign: "center", color: "#a0aec0", fontStyle: "italic" }}>No users found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 🔹 DEPARTMENTS MANAGEMENT */}
            <div className="card-hover" style={{ background: "#fff", padding: 24, borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", border: "1px solid #e8ecf0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "2px solid #f0f4f8" }}>
                <h2 style={{ color: "#127993", fontSize: 17, fontWeight: 700, margin: 0 }}>Manage Departments</h2>
                <span style={{ background: "linear-gradient(135deg, #e6faf3, #c6f6e0)", color: "#0d8f6e", fontSize: 12, padding: "6px 14px", borderRadius: 20, fontWeight: 700 }}>{departments.length} Depts</span>
              </div>
              
              <div style={{ display: "flex", gap: 8, marginBottom: 16, background: "#f8fafb", padding: 14, borderRadius: 12, border: "1px solid #e8ecf0" }}>
                <input placeholder="Department Name" value={newDept.department_name} onChange={(e) => setNewDept({...newDept, department_name: e.target.value})} style={{ border: "1px solid #e2e8f0", padding: "8px 12px", borderRadius: 8, flex: 1, outline: "none", fontSize: 13, transition: "all 0.2s" }} />
                <button onClick={createDepartment} className="btn-primary" style={{ background: "linear-gradient(135deg, #127993, #0f6075)", color: "#fff", padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" }}>Add Dept</button>
              </div>

              <div style={{ overflowX: "auto", flex: 1, maxHeight: 500, overflowY: "auto" }}>
                <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafb", borderBottom: "2px solid #e8ecf0" }}>
                      <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 12, color: "#718096", textTransform: "uppercase", letterSpacing: 0.5 }}>ID</th>
                      <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 12, color: "#718096", textTransform: "uppercase", letterSpacing: 0.5 }}>Department Name</th>
                      <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 12, color: "#718096", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.length > 0 ? departments.map(d => (
                      <tr key={d.department_id} style={{ borderBottom: "1px solid #f0f4f8", transition: "background 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f8fafb"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: "#a0aec0", fontSize: 12 }}>#{d.department_id}</td>
                        <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1a202c", fontSize: 13 }}>{d.department_name}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right" }}>
                          <button onClick={() => deleteDepartment(d.department_id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: 600, fontSize: 12 }}>Delete</button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="3" style={{ padding: 24, textAlign: "center", color: "#a0aec0", fontStyle: "italic" }}>No departments found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ─────── ASSIGN REVIEWS ─────── */}
        {activeTab === 'Assign Reviews' && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "fadeUp 0.4s ease" }}>
          {/* 🔹 FILTERS */}
          <div className="card-hover" style={{ background: "#fff", padding: 24, borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.05)", border: "1px solid #e8ecf0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "2px solid #f0f4f8" }}>
              <h2 style={{ color: "#127993", fontSize: 17, fontWeight: 700, margin: 0 }}>Filter Assignments</h2>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#718096", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Filter by Reviewer</label>
                <select onChange={(e) => setFilterReviewer(e.target.value)} value={filterReviewer} style={{ padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 10, outline: "none", fontSize: 13, background: "#fff", transition: "all 0.2s", cursor: "pointer" }}>
                  <option value="">All Reviewers</option>
                  {users.map(u => <option key={u.user_id} value={u.user_id}>{u.name}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#718096", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Filter by Reviewee</label>
                <select onChange={(e) => setFilterReviewee(e.target.value)} value={filterReviewee} style={{ padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 10, outline: "none", fontSize: 13, background: "#fff", transition: "all 0.2s", cursor: "pointer" }}>
                  <option value="">All Reviewees</option>
                  {users.map(u => <option key={u.user_id} value={u.user_id}>{u.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 🔥 ASSIGNMENTS LIST (Table Format) */}
          <div className="card-hover" style={{ background: "#fff", padding: 24, borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", border: "1px solid #e8ecf0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "2px solid #f0f4f8", flexWrap: "wrap", gap: 8 }}>
              <h2 style={{ color: "#127993", fontSize: 17, fontWeight: 700, margin: 0 }}>Review Assignments Hub</h2>
              
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {/* Batch Filter */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, background: "#f8fafb", border: "1px solid #e8ecf0", padding: "6px 12px", borderRadius: 8 }}>
                  <label style={{ color: "#718096", fontWeight: 600, margin: 0, whiteSpace: "nowrap" }}>Batch:</label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => handleBatchChange(e.target.value)}
                    style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, outline: "none", padding: "4px 8px", fontSize: 12, cursor: "pointer", minWidth: 130 }}
                  >
                    <option value="">All Batches</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.label || b.month_year}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, background: "#f8fafb", border: "1px solid #e8ecf0", padding: "6px 12px", borderRadius: 8 }}>
                  <label style={{ color: "#718096", fontWeight: 600, margin: 0, whiteSpace: "nowrap" }}>Per Person:</label>
                  <input 
                    type="number" min="1" max="20"
                    value={assignmentsPerUser} 
                    onChange={(e) => setAssignmentsPerUser(e.target.value)}
                    style={{ width: 40, textAlign: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, outline: "none", padding: "4px 0", fontSize: 12 }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, background: "#f8fafb", border: "1px solid #e8ecf0", padding: "6px 12px", borderRadius: 8 }}>
                  <label style={{ color: "#718096", fontWeight: 600, margin: 0, whiteSpace: "nowrap" }}>Round:</label>
                  <input 
                    type="number" min="1" max="20"
                    value={roundNumber} 
                    onChange={(e) => setRoundNumber(e.target.value)}
                    style={{ width: 40, textAlign: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, outline: "none", padding: "4px 0", fontSize: 12 }}
                  />
                </div>
                
                <button onClick={assignReviews} className="btn-primary" style={{
                  background: "linear-gradient(135deg, #127993, #0f6075)", color: "#fff",
                  padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontWeight: 600, display: "flex", alignItems: "center", gap: 6, fontSize: 12, whiteSpace: "nowrap",
                }}>
                  <span>Generate New</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>

                <button
                  onClick={sendBatchEmails}
                  disabled={!selectedBatchId || isBatchSending}
                  className="btn-primary"
                  style={{
                    background: (!selectedBatchId || isBatchSending) ? "#a0aec0" : "linear-gradient(135deg, #10b981, #059669)",
                    color: "#fff",
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "none",
                    cursor: (!selectedBatchId || isBatchSending) ? "not-allowed" : "pointer",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  {isBatchSending ? (
                    <>
                      <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                      Sending...
                    </>
                  ) : (
                    <>
                      <span>Send Emails</span>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Selected Batch Info */}
            {selectedBatchId && batches.find(b => String(b.id) === String(selectedBatchId)) && (
              <div style={{ background: "linear-gradient(135deg, #e6f7fb, #d0effa)", borderLeft: "4px solid #127993", padding: "10px 16px", borderRadius: "0 8px 8px 0", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ margin: 0, color: "#127993", fontWeight: 600, fontSize: 13 }}>
                  📋 Showing batch: <strong>{batches.find(b => String(b.id) === String(selectedBatchId))?.label || selectedBatchId}</strong>
                </p>
                <span style={{ background: "#127993", color: "#fff", fontSize: 11, padding: "3px 10px", borderRadius: 12, fontWeight: 700 }}>
                  {filteredAssignments.length} assignments
                </span>
              </div>
            )}

            <div style={{ flex: 1, overflowX: "auto", overflowY: "auto", paddingRight: 8, maxHeight: 600 }}>
              <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafb", borderBottom: "2px solid #e8ecf0" }}>
                    <th style={{ padding: "12px 16px", fontWeight: 600, fontSize: 12, color: "#718096", textTransform: "uppercase", letterSpacing: 0.5 }}>Reviewer</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, fontSize: 12, color: "#718096", textTransform: "uppercase", letterSpacing: 0.5 }}>Reviewer Dept</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, fontSize: 12, color: "#cbd5e0", textAlign: "center" }}>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, fontSize: 12, color: "#718096", textTransform: "uppercase", letterSpacing: 0.5 }}>Reviewee</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, fontSize: 12, color: "#718096", textTransform: "uppercase", letterSpacing: 0.5 }}>Reviewee Dept</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.length > 0 ? (
                    filteredAssignments.map((a, index) => (
                      <tr key={index} style={{ borderBottom: "1px solid #f0f4f8", transition: "background 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f8fafb"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ height: 32, width: 32, borderRadius: "50%", background: "linear-gradient(135deg, #dbeafe, #bfdbfe)", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6", fontWeight: 700, fontSize: 12 }}>
                              {getUserName(a.reviewer_id).charAt(0)}
                            </div>
                            <div>
                              <p style={{ fontWeight: 600, color: "#1a202c", margin: 0, fontSize: 13 }}>{getUserName(a.reviewer_id)}</p>
                              <p style={{ fontSize: 11, color: "#a0aec0", margin: 0 }}>{getUserEmail(a.reviewer_id)}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: "#4a5568" }}>
                          <span style={{ background: "#eef2ff", color: "#6366f1", padding: "4px 10px", borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{getUserDepartmentName(a.reviewer_id)}</span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center", color: "#cbd5e0" }}>
                          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ height: 32, width: 32, borderRadius: "50%", background: "linear-gradient(135deg, #d1fae5, #a7f3d0)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981", fontWeight: 700, fontSize: 12 }}>
                              {getUserName(a.reviewee_id).charAt(0)}
                            </div>
                            <div>
                              <p style={{ fontWeight: 600, color: "#1a202c", margin: 0, fontSize: 13 }}>{getUserName(a.reviewee_id)}</p>
                              <p style={{ fontSize: 11, color: "#a0aec0", margin: 0 }}>{getUserEmail(a.reviewee_id)}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: "#4a5568" }}>
                          <span style={{ background: "#f0fdf4", color: "#16a34a", padding: "4px 10px", borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{getUserDepartmentName(a.reviewee_id)}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="5" style={{ padding: 32, textAlign: "center", color: "#a0aec0", fontStyle: "italic" }}>No assignments match the current filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

        {/* ─────── MANUAL ASSIGN ─────── */}
        {activeTab === 'Manual Assign' && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>

            {/* Step Indicator */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 28 }}>
              {[
                { num: 1, label: "Select Reviewer" },
                { num: 2, label: "Select Reviewee" },
                { num: 3, label: "Preview & Send" },
              ].map((step, i) => (
                <React.Fragment key={step.num}>
                  <div
                    onClick={() => {
                      if (step.num === 1) setManualStep(1);
                      if (step.num === 2 && manualReviewer.length > 0) setManualStep(2);
                      if (step.num === 3 && manualReviewer.length > 0 && manualReviewee.length > 0) setManualStep(3);
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                      padding: "10px 20px", borderRadius: 12,
                      background: manualStep === step.num ? "linear-gradient(135deg, #127993, #0f6075)" : manualStep > step.num ? "#d0effa" : "#f0f4f8",
                      color: manualStep === step.num ? "#fff" : manualStep > step.num ? "#127993" : "#a0aec0",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <span style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: manualStep === step.num ? "rgba(255,255,255,0.25)" : manualStep > step.num ? "#127993" : "#e2e8f0",
                      color: manualStep > step.num ? "#fff" : "inherit",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: 13,
                    }}>
                      {manualStep > step.num ? "✓" : step.num}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{step.label}</span>
                  </div>
                  {i < 2 && (
                    <div style={{ width: 48, height: 2, background: manualStep > step.num ? "#127993" : "#e2e8f0", transition: "background 0.3s" }} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* ─── Step 1: Select Reviewer ─── */}
            {manualStep === 1 && (
              <div className="card-hover" style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.05)", border: "1px solid #e8ecf0", overflow: "hidden" }}>
                <div style={{ padding: "20px 24px", borderBottom: "2px solid #f0f4f8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h2 style={{ color: "#127993", fontSize: 17, fontWeight: 700, margin: 0 }}>Step 1: Select Reviewer</h2>
                    <p style={{ color: "#718096", fontSize: 13, margin: "4px 0 0" }}>Choose who will receive the assignment email</p>
                  </div>
                  <span style={{ background: "linear-gradient(135deg, #e6f7fb, #d0effa)", color: "#127993", fontSize: 12, padding: "6px 14px", borderRadius: 20, fontWeight: 700 }}>
                    {manualReviewer.length} selected
                  </span>
                </div>

                <div style={{ padding: "16px 24px", borderBottom: "1px solid #f0f4f8", display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#a0aec0" }} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      placeholder="Search users..."
                      value={Reviewerearch}
                      onChange={e => setReviewerearch(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px 10px 40px", border: "1px solid #e2e8f0", borderRadius: 10, outline: "none", fontSize: 13, transition: "all 0.2s", boxSizing: "border-box" }}
                    />
                  </div>
                  <button onClick={selectAllReviewer} style={{
                    background: "#f0f4f8", border: "1px solid #e2e8f0", padding: "10px 16px", borderRadius: 10,
                    cursor: "pointer", fontWeight: 600, fontSize: 12, color: "#4a5568", whiteSpace: "nowrap", transition: "all 0.2s",
                  }}>
                    {users.filter(u => u.name.toLowerCase().includes(Reviewerearch.toLowerCase())).every(u => manualReviewer.includes(u.user_id)) ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div style={{ maxHeight: 400, overflowY: "auto", padding: "8px 12px" }}>
                  {users.filter(u => u.name.toLowerCase().includes(Reviewerearch.toLowerCase())).map(u => {
                    const isSelected = manualReviewer.includes(u.user_id);
                    return (
                      <div
                        key={u.user_id}
                        className="check-item"
                        onClick={() => toggleRecipient(u.user_id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "10px 14px", borderRadius: 10, marginBottom: 2,
                          background: isSelected ? "#e6f7fb" : "transparent",
                          border: isSelected ? "1px solid #b2e0eb" : "1px solid transparent",
                        }}
                      >
                        <div style={{
                          width: 20, height: 20, borderRadius: 6,
                          border: isSelected ? "none" : "2px solid #cbd5e0",
                          background: isSelected ? "linear-gradient(135deg, #127993, #0f6075)" : "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.2s", flexShrink: 0,
                        }}>
                          {isSelected && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
                        </div>
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%",
                          background: isSelected ? "linear-gradient(135deg, #127993, #0f6075)" : "linear-gradient(135deg, #e2e8f0, #cbd5e0)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: isSelected ? "#fff" : "#718096", fontWeight: 700, fontSize: 14, flexShrink: 0,
                        }}>
                          {u.name.charAt(0)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, color: "#1a202c", margin: 0, fontSize: 13 }}>{u.name}</p>
                          <p style={{ fontSize: 11, color: "#a0aec0", margin: 0 }}>{u.email}</p>
                        </div>
                        <span style={{ background: "#eef2ff", color: "#6366f1", padding: "3px 10px", borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{getUserDepartmentName(u.user_id)}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ padding: "16px 24px", borderTop: "1px solid #f0f4f8", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => { if (manualReviewer.length > 0) setManualStep(2); else showToast("Select at least one recipient", "error"); }}
                    className="btn-primary"
                    style={{
                      background: manualReviewer.length > 0 ? "linear-gradient(135deg, #127993, #0f6075)" : "#e2e8f0",
                      color: manualReviewer.length > 0 ? "#fff" : "#a0aec0",
                      padding: "10px 28px", borderRadius: 10, border: "none", cursor: "pointer",
                      fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8,
                    }}
                  >
                    Next Step
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            )}

            {/* ─── Step 2: Select Assignees ─── */}
            {manualStep === 2 && (
              <div className="card-hover" style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.05)", border: "1px solid #e8ecf0", overflow: "hidden" }}>
                <div style={{ padding: "20px 24px", borderBottom: "2px solid #f0f4f8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h2 style={{ color: "#127993", fontSize: 17, fontWeight: 700, margin: 0 }}>Step 2: Select Users to Assign</h2>
                    <p style={{ color: "#718096", fontSize: 13, margin: "4px 0 0" }}>Choose the users that Reviewer will need to review</p>
                  </div>
                  <span style={{ background: "linear-gradient(135deg, #fff7ed, #ffedd5)", color: "#e97f0d", fontSize: 12, padding: "6px 14px", borderRadius: 20, fontWeight: 700 }}>
                    {manualReviewee.length} selected
                  </span>
                </div>

                {/* Selected Reviewer preview */}
                <div style={{ padding: "12px 24px", background: "#f8fafb", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#718096" }}>Reviewer:</span>
                  {manualReviewer.map(id => (
                    <span key={id} style={{
                      background: "linear-gradient(135deg, #e6f7fb, #d0effa)", color: "#127993",
                      padding: "4px 12px", borderRadius: 16, fontSize: 11, fontWeight: 600,
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      {getUserName(id)}
                      <button onClick={() => toggleRecipient(id)} style={{ background: "none", border: "none", color: "#127993", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                </div>

                <div style={{ padding: "16px 24px", borderBottom: "1px solid #f0f4f8", display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#a0aec0" }} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      placeholder="Search users..."
                      value={assigneeSearch}
                      onChange={e => setAssigneeSearch(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px 10px 40px", border: "1px solid #e2e8f0", borderRadius: 10, outline: "none", fontSize: 13, transition: "all 0.2s", boxSizing: "border-box" }}
                    />
                  </div>
                  <button onClick={selectAllAssignees} style={{
                    background: "#f0f4f8", border: "1px solid #e2e8f0", padding: "10px 16px", borderRadius: 10,
                    cursor: "pointer", fontWeight: 600, fontSize: 12, color: "#4a5568", whiteSpace: "nowrap", transition: "all 0.2s",
                  }}>
                    {users.filter(u => u.name.toLowerCase().includes(assigneeSearch.toLowerCase())).every(u => manualReviewee.includes(u.user_id)) ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div style={{ maxHeight: 400, overflowY: "auto", padding: "8px 12px" }}>
                  {users.filter(u => u.name.toLowerCase().includes(assigneeSearch.toLowerCase())).map(u => {
                    const isSelected = manualReviewee.includes(u.user_id);
                    return (
                      <div
                        key={u.user_id}
                        className="check-item"
                        onClick={() => toggleAssignee(u.user_id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "10px 14px", borderRadius: 10, marginBottom: 2,
                          background: isSelected ? "#fff7ed" : "transparent",
                          border: isSelected ? "1px solid #fed7aa" : "1px solid transparent",
                        }}
                      >
                        <div style={{
                          width: 20, height: 20, borderRadius: 6,
                          border: isSelected ? "none" : "2px solid #cbd5e0",
                          background: isSelected ? "linear-gradient(135deg, #e97f0d, #d97706)" : "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.2s", flexShrink: 0,
                        }}>
                          {isSelected && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
                        </div>
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%",
                          background: isSelected ? "linear-gradient(135deg, #e97f0d, #d97706)" : "linear-gradient(135deg, #e2e8f0, #cbd5e0)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: isSelected ? "#fff" : "#718096", fontWeight: 700, fontSize: 14, flexShrink: 0,
                        }}>
                          {u.name.charAt(0)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, color: "#1a202c", margin: 0, fontSize: 13 }}>{u.name}</p>
                          <p style={{ fontSize: 11, color: "#a0aec0", margin: 0 }}>{u.email}</p>
                        </div>
                        <span style={{ background: "#eef2ff", color: "#6366f1", padding: "3px 10px", borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{getUserDepartmentName(u.user_id)}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ padding: "16px 24px", borderTop: "1px solid #f0f4f8", display: "flex", justifyContent: "space-between" }}>
                  <button onClick={() => setManualStep(1)} style={{
                    background: "#f0f4f8", color: "#4a5568", padding: "10px 28px", borderRadius: 10,
                    border: "1px solid #e2e8f0", cursor: "pointer", fontWeight: 600, fontSize: 14,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Back
                  </button>
                  <button
                    onClick={() => { if (manualReviewee.length > 0) setManualStep(3); else showToast("Select at least one user to assign", "error"); }}
                    className="btn-primary"
                    style={{
                      background: manualReviewee.length > 0 ? "linear-gradient(135deg, #127993, #0f6075)" : "#e2e8f0",
                      color: manualReviewee.length > 0 ? "#fff" : "#a0aec0",
                      padding: "10px 28px", borderRadius: 10, border: "none", cursor: "pointer",
                      fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8,
                    }}
                  >
                    Next Step
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            )}

            {/* ─── Step 3: Preview & Send ─── */}
            {manualStep === 3 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Reviewer Card */}
                <div className="card-hover" style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.05)", border: "1px solid #e8ecf0", overflow: "hidden" }}>
                  <div style={{ padding: "16px 24px", borderBottom: "2px solid #f0f4f8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ color: "#127993", fontSize: 15, fontWeight: 700, margin: 0 }}>📬 Reviewer</h3>
                    <span style={{ background: "linear-gradient(135deg, #e6f7fb, #d0effa)", color: "#127993", fontSize: 11, padding: "4px 12px", borderRadius: 16, fontWeight: 700 }}>{manualReviewer.length}</span>
                  </div>
                  <div style={{ padding: "12px 16px", maxHeight: 300, overflowY: "auto" }}>
                    {manualReviewer.map(id => (
                      <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, marginBottom: 4 }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f8fafb"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #127993, #0f6075)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                          {getUserName(id).charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: "#1a202c", margin: 0, fontSize: 13 }}>{getUserName(id)}</p>
                          <p style={{ fontSize: 11, color: "#a0aec0", margin: 0 }}>{getUserEmail(id)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assignees Card */}
                <div className="card-hover" style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.05)", border: "1px solid #e8ecf0", overflow: "hidden" }}>
                  <div style={{ padding: "16px 24px", borderBottom: "2px solid #f0f4f8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ color: "#e97f0d", fontSize: 15, fontWeight: 700, margin: 0 }}>📋 Assigned Users</h3>
                    <span style={{ background: "linear-gradient(135deg, #fff7ed, #ffedd5)", color: "#e97f0d", fontSize: 11, padding: "4px 12px", borderRadius: 16, fontWeight: 700 }}>{manualReviewee.length}</span>
                  </div>
                  <div style={{ padding: "12px 16px", maxHeight: 300, overflowY: "auto" }}>
                    {manualReviewee.map(id => (
                      <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, marginBottom: 4 }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f8fafb"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #e97f0d, #d97706)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                          {getUserName(id).charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: "#1a202c", margin: 0, fontSize: 13 }}>{getUserName(id)}</p>
                          <p style={{ fontSize: 11, color: "#a0aec0", margin: 0 }}>{getUserEmail(id)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary & Send Button */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{
                    background: "linear-gradient(135deg, #f0f9fb, #e6f7fb)",
                    border: "1px solid #b2e0eb", borderRadius: 16, padding: 24,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <p style={{ fontWeight: 700, color: "#127993", fontSize: 15, margin: 0 }}>Ready to send</p>
                      <p style={{ color: "#4a7c87", fontSize: 13, margin: "4px 0 0" }}>
                        {manualReviewee.length} user(s) will be assigned to {manualReviewer.length} recipient(s) — emails will be sent immediately.
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button onClick={() => setManualStep(2)} style={{
                        background: "#fff", color: "#4a5568", padding: "12px 24px", borderRadius: 10,
                        border: "1px solid #e2e8f0", cursor: "pointer", fontWeight: 600, fontSize: 13,
                      }}>
                        Back
                      </button>
                      <button
                        onClick={sendManualAssignment}
                        disabled={isSending}
                        className="btn-primary"
                        style={{
                          background: isSending ? "#a0aec0" : "linear-gradient(135deg, #10b981, #059669)",
                          color: "#fff", padding: "12px 32px", borderRadius: 10, border: "none",
                          cursor: isSending ? "not-allowed" : "pointer",
                          fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8,
                          boxShadow: isSending ? "none" : "0 4px 16px rgba(16,185,129,0.3)",
                        }}
                      >
                        {isSending ? (
                          <>
                            <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                            Sending...
                          </>
                        ) : (
                          <>
                            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            Send Emails
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

export default Dashboard;
