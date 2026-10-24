import { useCallback, useEffect, useMemo, useState } from 'react'
import { CarFront, Search, LogOut, Plus, RefreshCw, Trash2, Pencil, Gauge, ShieldCheck, CircleDollarSign } from 'lucide-react'
import { api } from './api'

const emptyVehicle = { make: '', model: '', category: 'Sedan', price: '', quantity: '' }

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const result = await api(`/auth/${mode === 'login' ? 'login' : 'register'}`, { method: 'POST', body: JSON.stringify({ email, password }) })
      onAuthenticated({ token: result.access_token, isAdmin: result.is_admin, email })
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <main className="auth-wrap"><section className="auth-card"><div className="brand-mark"><CarFront size={27}/></div><p className="eyebrow">DRIVEDESK INVENTORY</p><h1>{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</h1><p className="muted">A smarter way to manage your dealership inventory.</p><div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => {setMode('login');setError('')}}>Sign in</button><button className={mode === 'register' ? 'active' : ''} onClick={() => {setMode('register');setError('')}}>Register</button></div><form onSubmit={submit} className="form-stack"><label>Email address<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></label><label>Password<input type="password" required minLength={mode === 'register' ? 8 : 1} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter your password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/></label>{error && <p role="alert" className="error-box">{error}</p>}<button className="btn btn-primary full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button></form><p className="auth-note">Administrator access is provisioned by the system administrator.</p></section></main>
}

function VehicleForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || emptyVehicle)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const change = e => setForm({ ...form, [e.target.name]: e.target.value })
  async function submit(e) { e.preventDefault(); setBusy(true); setError(''); try { await onSave({ ...form, price: Number(form.price), quantity: Number(form.quantity) }) } catch (err) { setError(err.message) } finally { setBusy(false) } }
  return <form onSubmit={submit} className="vehicle-form"><div className="form-grid"><label>Make<input name="make" required maxLength="80" value={form.make} onChange={change} placeholder="e.g. Toyota"/></label><label>Model<input name="model" required maxLength="100" value={form.model} onChange={change} placeholder="e.g. Camry"/></label><label>Category<select name="category" value={form.category} onChange={change}><option>Sedan</option><option>SUV</option><option>Hatchback</option><option>Coupe</option><option>Electric</option><option>Truck</option><option>Van</option><option>Other</option></select></label><label>Price ($)<input name="price" type="number" required min="0" step="0.01" value={form.price} onChange={change} placeholder="25000"/></label><label>Quantity in stock<input name="quantity" type="number" required min="0" step="1" value={form.quantity} onChange={change} placeholder="4"/></label></div>{error && <p role="alert" className="error-box">{error}</p>}<div className="form-actions"><button type="button" className="btn btn-quiet" onClick={onCancel}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save vehicle'}</button></div></form>
}

function VehicleCard({ vehicle, isAdmin, onPurchase, onEdit, onDelete, onRestock }) {
  const out = vehicle.quantity === 0
  return <article className="vehicle-card"><div className="vehicle-art"><div className="art-circle"><CarFront size={52} strokeWidth={1.3}/></div><span className={`stock-pill ${out ? 'out' : ''}`}>{out ? 'Out of stock' : `${vehicle.quantity} in stock`}</span><span className="vehicle-id">ID #{String(vehicle.id).padStart(4, '0')}</span></div><div className="vehicle-info"><span className="category-tag">{vehicle.category}</span><h3>{vehicle.make} {vehicle.model}</h3><div className="price-row"><span className="price">{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(vehicle.price)}</span><span className="per-unit">per vehicle</span></div><div className="card-actions"><button className="btn btn-primary" disabled={out} onClick={()=>onPurchase(vehicle)}>{out ? 'Unavailable' : 'Purchase'}</button>{isAdmin && <><button title="Edit vehicle" className="icon-btn" onClick={()=>onEdit(vehicle)}><Pencil size={16}/></button><button title="Restock one" className="icon-btn" onClick={()=>onRestock(vehicle)}><RefreshCw size={16}/></button><button title="Delete vehicle" className="icon-btn danger" onClick={()=>onDelete(vehicle)}><Trash2 size={16}/></button></>}</div></div></article>
}

function Dashboard({ session, onLogout }) {
  const [vehicles, setVehicles] = useState([])
  const [search, setSearch] = useState({ make: '', model: '', category: '', min_price: '', max_price: '' })
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [formMode, setFormMode] = useState(null)
  const [editing, setEditing] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const headers = useMemo(() => ({ token: session.token }), [session.token])
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams()
      Object.entries(search).forEach(([key, value]) => { if (value !== '') params.set(key, value) })
      const path = params.size ? `/vehicles/search?${params}` : '/vehicles'
      setVehicles(await api(path, headers))
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }, [headers, search, refreshKey])
  useEffect(() => { load() }, [load])
  async function mutate(path, method, body) { await api(path, { ...headers, method, ...(body ? { body: JSON.stringify(body) } : {}) }); setRefreshKey(n=>n+1) }
  async function purchase(vehicle) { setNotice(''); setError(''); try { await mutate(`/vehicles/${vehicle.id}/purchase`, 'POST'); setNotice(`Purchase recorded: ${vehicle.make} ${vehicle.model}. Stock updated.`) } catch(err) {setError(err.message)} }
  async function saveVehicle(data) { if (editing) await mutate(`/vehicles/${editing.id}`, 'PUT', data); else await mutate('/vehicles', 'POST', data); setFormMode(null); setEditing(null); setNotice(editing ? 'Vehicle details updated.' : 'Vehicle added to inventory.') }
  async function deleteVehicle(vehicle) { if (!window.confirm(`Delete ${vehicle.make} ${vehicle.model}? This cannot be undone.`)) return; try { await mutate(`/vehicles/${vehicle.id}`, 'DELETE'); setNotice('Vehicle deleted.') } catch(err) {setError(err.message)} }
  async function restock(vehicle) { const raw = window.prompt(`How many ${vehicle.make} ${vehicle.model} units should be added?`, '1'); if (raw === null) return; const amount = Number(raw); if (!Number.isInteger(amount) || amount < 1) {setError('Enter a whole number greater than zero.');return} try { await mutate(`/vehicles/${vehicle.id}/restock?amount=${amount}`, 'POST'); setNotice(`Restocked ${vehicle.make} ${vehicle.model} by ${amount}.`) } catch(err) {setError(err.message)} }
  const totalStock = vehicles.reduce((sum, v)=>sum+v.quantity,0)
  const inventoryValue = vehicles.reduce((sum, v)=>sum+v.price*v.quantity,0)
  return <div className="app-shell"><header className="topbar"><div className="brand"><div className="brand-mark small"><CarFront size={22}/></div><div><strong>DriveDesk</strong><span>DEALERSHIP INVENTORY</span></div></div><div className="topbar-right"><span className="user-chip"><span className="user-dot"/>{session.email}</span>{session.isAdmin && <span className="admin-tag"><ShieldCheck size={13}/> Admin</span>}<button className="logout-btn" onClick={onLogout}><LogOut size={16}/><span>Sign out</span></button></div></header><main className="main-content"><section className="welcome-row"><div><p className="eyebrow">OVERVIEW / INVENTORY</p><h1>Vehicle inventory<span>.</span></h1><p className="muted">Track stock, discover vehicles, and keep your dealership moving.</p></div>{session.isAdmin && <button className="btn btn-primary add-btn" onClick={()=>{setEditing(null);setFormMode('add')}}><Plus size={17}/> Add vehicle</button>}</section><section className="stats-grid"><div className="stat-card"><div className="stat-icon blue"><CarFront size={19}/></div><p>Total models</p><strong>{vehicles.length}</strong><span>Matching your filters</span></div><div className="stat-card"><div className="stat-icon green"><Gauge size={19}/></div><p>Units in stock</p><strong>{totalStock}</strong><span>Available inventory</span></div><div className="stat-card"><div className="stat-icon amber"><CircleDollarSign size={19}/></div><p>Stock value</p><strong>{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:1}).format(inventoryValue)}</strong><span>Based on listed prices</span></div></section>{(notice || error) && <div className={error ? 'notice error-box' : 'notice success-box'} role="status">{error || notice}<button onClick={()=>{setNotice('');setError('')}} aria-label="Dismiss">×</button></div>}{formMode && <section className="panel form-panel"><div className="panel-heading"><div><p className="eyebrow">INVENTORY MANAGEMENT</p><h2>{editing ? 'Edit vehicle' : 'Add a vehicle'}</h2></div><button className="icon-btn" onClick={()=>{setFormMode(null);setEditing(null)}} aria-label="Close form">×</button></div><VehicleForm key={editing?.id || 'new'} initial={editing ? {...editing, price:String(editing.price), quantity:String(editing.quantity)} : emptyVehicle} onSave={saveVehicle} onCancel={()=>{setFormMode(null);setEditing(null)}}/></section>}<section className="panel filters-panel"><div className="panel-heading"><div><p className="eyebrow">FIND YOUR NEXT VEHICLE</p><h2>Browse inventory</h2></div><span className="result-count">{vehicles.length} results</span></div><div className="filters-grid"><label className="search-field"><span>Make</span><div><Search size={16}/><input value={search.make} onChange={e=>setSearch({...search,make:e.target.value})} placeholder="Toyota, BMW…"/></div></label><label className="search-field"><span>Model</span><div><Search size={16}/><input value={search.model} onChange={e=>setSearch({...search,model:e.target.value})} placeholder="Model name"/></div></label><label className="search-field"><span>Category</span><select value={search.category} onChange={e=>setSearch({...search,category:e.target.value})}><option value="">All categories</option>{['Sedan','SUV','Hatchback','Coupe','Electric','Truck','Van','Other'].map(c=><option key={c}>{c}</option>)}</select></label><label className="search-field"><span>Min price ($)</span><input type="number" min="0" value={search.min_price} onChange={e=>setSearch({...search,min_price:e.target.value})} placeholder="0"/></label><label className="search-field"><span>Max price ($)</span><input type="number" min="0" value={search.max_price} onChange={e=>setSearch({...search,max_price:e.target.value})} placeholder="No limit"/></label><button className="btn btn-quiet reset-btn" onClick={()=>setSearch({make:'',model:'',category:'',min_price:'',max_price:''})}>Clear filters</button></div></section><section className="inventory-section"><div className="section-title"><h2>Available vehicles</h2><span>Prices in USD</span></div>{loading ? <div className="empty-state">Loading inventory…</div> : vehicles.length === 0 ? <div className="empty-state"><CarFront size={35}/><h3>No vehicles found</h3><p>Try changing your search filters.{session.isAdmin ? ' You can also add a vehicle.' : ''}</p></div> : <div className="vehicle-grid">{vehicles.map(vehicle=><VehicleCard key={vehicle.id} vehicle={vehicle} isAdmin={session.isAdmin} onPurchase={purchase} onEdit={v=>{setEditing(v);setFormMode('edit');window.scrollTo({top:0,behavior:'smooth'})}} onDelete={deleteVehicle} onRestock={restock}/>)}</div>}</section><footer className="footer"><span>DriveDesk Inventory</span><span>Built for reliable inventory operations · {new Date().getFullYear()}</span></footer></main></div>
}

export default function App() {
  const [session, setSession] = useState(() => { try { return JSON.parse(localStorage.getItem('dealership_session')) } catch { return null } })
  function authenticated(value) { localStorage.setItem('dealership_session', JSON.stringify(value)); setSession(value) }
  function logout() { localStorage.removeItem('dealership_session'); setSession(null) }
  return session?.token ? <Dashboard session={session} onLogout={logout}/> : <AuthScreen onAuthenticated={authenticated}/> 
}
