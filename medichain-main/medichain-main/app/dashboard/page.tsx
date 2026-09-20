'use client'

import { useState } from 'react'
import { ArrowRight, Check, Clock3, Fingerprint, Menu, Plus, ShieldCheck, Upload, X } from 'lucide-react'
import { useWallet } from '@/lib/WalletContext'
import { useRecords } from '@/lib/useRecords'
import { useAccess } from '@/lib/useAccess'
import { useRouter } from 'next/navigation'

const records = [
  ['Annual physical examination', 'Clinical note', 'Sep 14, 2024', 'Dr. Maya Chen'],
  ['Complete blood count', 'Lab results', 'Sep 14, 2024', 'Northstar Labs'],
  ['MRI — Lumbar spine', 'Imaging report', 'Aug 22, 2024', 'Valley Imaging'],
  ['Prescription history', 'Medication', 'Jul 03, 2024', 'Dr. Maya Chen'],
]
const grants = [['Dr. Maya Chen', 'Primary care · Northstar Health', 'Expires in 6 days'], ['Valley Imaging', 'Radiology provider', 'Expires in 2 days']]
const audit = [['Dr. Menon viewed your Lab Results', 'Sep 12, 2024 · 10:42 AM'], ['You shared your Complete blood count', 'Sep 11, 2024 · 4:18 PM'], ['You revoked Wellness Center access', 'Sep 08, 2024 · 9:05 AM']]

function Verified() { return <span className="inline-flex items-center gap-1 rounded-full bg-[#e5eee8] px-2 py-1 text-[10px] font-semibold text-[#2c6045]"><Check className="size-3" />Verified</span> }
function NavButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) { return <button onClick={onClick} className={`w-full rounded-sm px-3 py-2 text-left text-sm transition ${active ? 'bg-[#dfe9e2] font-medium text-[#1f3d2e]' : 'text-[#68766d] hover:bg-[#f0f2ed]'}`}>{label}</button> }

export default function DashboardPage() {
  const router = useRouter()
  const { address, isConnected, disconnect } = useWallet()
  const { records: backendRecords, isLoading: recordsLoading, uploadRecord } = useRecords(isConnected)
  const { grantAccess, revokeAccess } = useAccess()
  const [active, setActive] = useState('Overview')
  const [mobile, setMobile] = useState(false)
  const [modal, setModal] = useState(false)
  const [uploadModal, setUploadModal] = useState(false)
  const [revoked, setRevoked] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const toggle = (name: string) => setRevoked((items) => items.includes(name) ? items.filter((item) => item !== name) : [...items, name])

  // Format date helper
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) return
    
    try {
      await uploadRecord(selectedFile)
      setUploadModal(false)
      setSelectedFile(null)
      alert('Record uploaded successfully!')
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload record')
    }
  }

  // Redirect if not connected
  if (!isConnected) {
    router.push('/')
    return null
  }

  // Use backend records if available, fallback to mock data
  const displayRecords = backendRecords.length > 0 
    ? backendRecords.map(r => [r.filename, 'Medical record', formatDate(r.createdAt), address?.slice(0, 8)])
    : records

  return <div className="min-h-screen bg-[#faf8f5] text-[#1a1d1a]">
    <header className="border-b border-[#dfe5df] bg-[#faf8f5]/95"><div className="mx-auto flex h-[72px] max-w-[1360px] items-center justify-between px-5 sm:px-8">
      <div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-full bg-[#1f3d2e] text-[#faf8f5]"><Fingerprint className="size-[18px]" /></div><span className="text-lg font-semibold tracking-[-0.04em]">MediChain</span></div>
      <nav className="hidden items-center gap-7 text-sm text-[#607067] lg:flex"><a href="/#features">Features</a><a href="/#how">How it works</a><a href="/#security">Security</a></nav>
      <div className="flex items-center gap-3">
        <span className="hidden text-xs text-[#52645a] sm:block">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
        <button onClick={() => setActive('Audit trail')} className="hidden text-sm text-[#52645a] sm:block">Audit trail</button>
        <button onClick={() => setUploadModal(true)} className="flex items-center gap-2 rounded-sm border border-[#cbd8cd] bg-white px-4 py-2.5 text-sm font-medium text-[#1f3d2e] hover:bg-[#f0f2ed]"><Upload className="size-4" />Upload</button>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 rounded-sm bg-[#1f3d2e] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2c4a3a]"><Plus className="size-4" />Grant access</button>
        <button onClick={disconnect} className="hidden text-sm text-[#52645a] hover:text-[#1f3d2e] sm:block">Disconnect</button>
      </div>
    </div></header>

    <div className="mx-auto flex max-w-[1360px]">
      <aside className={`${mobile ? 'fixed inset-y-0 left-0 z-40 flex shadow-xl' : 'hidden'} w-[248px] shrink-0 flex-col border-r border-[#dfe5df] bg-[#faf8f5] p-6 lg:flex`}>
        <div className="mb-10 flex items-center justify-between lg:hidden"><span className="font-semibold">Workspace</span><button onClick={() => setMobile(false)} aria-label="Close navigation"><X className="size-5" /></button></div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8fa396]">Patient workspace</p><nav className="flex flex-col gap-1"><NavButton label="Overview" active={active === 'Overview'} onClick={() => setActive('Overview')} /><NavButton label="My records" active={active === 'My records'} onClick={() => setActive('My records')} /><NavButton label="Access grants" active={active === 'Access grants'} onClick={() => setActive('Access grants')} /><NavButton label="Provider view" active={active === 'Provider view'} onClick={() => setActive('Provider view')} /><NavButton label="Audit trail" active={active === 'Audit trail'} onClick={() => setActive('Audit trail')} /></nav>
        <div className="mt-auto border-t border-[#dfe5df] pt-5"><p className="text-xs font-medium">{address?.slice(0, 10)}...{address?.slice(-8)}</p><p className="mt-1 text-xs text-[#7b887f]">Patient identity verified</p><div className="mt-4 flex items-center gap-2 text-xs text-[#52715d]"><ShieldCheck className="size-4" />Identity healthy</div></div>
      </aside>

      <main className="min-w-0 flex-1 px-5 py-10 sm:px-10 lg:px-14"><div className="max-w-[1000px]">
        <div className="mb-12 flex flex-col gap-5 border-b border-[#dfe5df] pb-10 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#789181]">Patient identity / {active}</p><h1 className="max-w-[620px] text-4xl font-semibold leading-[1.05] tracking-[-0.05em] sm:text-5xl">Your health records, finally yours.</h1><p className="mt-4 max-w-[540px] text-base leading-7 text-[#66746b]">A patient-owned, verifiable medical identity for care that moves with you.</p></div><div className="shrink-0 text-sm text-[#607067]"><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#3f7b58]" />Identity verified</div><p className="mt-2 text-xs text-[#8a968e]">Last checked today</p></div></div>

        {active === 'Provider view' ? <section><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#789181]">Provider workspace</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Records shared with Northstar Health</h2><p className="mt-2 max-w-[560px] text-sm leading-6 text-[#69776e]">A focused clinical view of the records this provider can currently access.</p><div className="mt-8 divide-y divide-[#dfe5df] border-y border-[#dfe5df]">{displayRecords.slice(0, 2).map(([title, type, date, provider]) => <article key={title} className="flex items-center justify-between gap-4 py-5"><div><p className="text-sm font-medium">{title}</p><p className="mt-2 text-xs text-[#7d8981]">{type} · Last updated {date}</p></div><Verified /></article>)}</div><div className="mt-8 flex items-center justify-between border border-[#cbd8cd] bg-white p-5"><div><p className="text-sm font-medium">MRI — Lumbar spine</p><p className="mt-1 text-xs text-[#7d8981]">Not currently shared with this provider</p></div><button className="border border-[#9db5a3] px-4 py-2 text-sm font-medium text-[#2c6045]">Request access</button></div></section> : active === 'Audit trail' ? <section><h2 className="text-2xl font-semibold tracking-[-0.03em]">A clear record of your data</h2><p className="mt-2 text-sm text-[#69776e]">Plain-language activity across your health identity.</p><div className="mt-8 flex flex-col">{audit.map(([title, time]) => <div key={title} className="flex gap-5 border-b border-[#dfe5df] py-5"><div className="mt-1 size-2 rounded-full bg-[#3f7b58]" /><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs text-[#7d8981]">{time}</p></div></div>)}</div></section> : <>
          <section id="identity"><div className="mb-4 flex items-end justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#789181]">Your records</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Verified health history</h2></div><button onClick={() => setActive('My records')} className="hidden items-center gap-2 text-sm text-[#2c6045] sm:flex">View all <ArrowRight className="size-4" /></button></div>
          {recordsLoading ? <div className="py-10 text-center text-sm text-[#69776e]">Loading records...</div> : displayRecords.length === 0 ? <div className="py-10 text-center"><p className="text-sm text-[#69776e]">No records uploaded yet.</p><button onClick={() => setUploadModal(true)} className="mt-4 text-sm font-medium text-[#2c6045] underline underline-offset-4">Upload your first record</button></div> : <div className="grid border-t border-[#dfe5df] sm:grid-cols-2">{displayRecords.map(([title, type, date, provider]) => <article key={title} className="border-b border-[#dfe5df] py-5 sm:pr-8"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium">{title}</p><p className="mt-2 text-xs text-[#7d8981]">{type} · {provider}</p></div><Verified /></div><p className="mt-4 text-xs text-[#8a968e]">{date}</p></article>)}</div>}
          </section>
          <section className="mt-8 border-l-4 border-[#b48a43] bg-[#f5f0e4] p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a6b32]">Clinical safety notice</p><h3 className="mt-2 text-sm font-semibold">Possible interaction with existing prescription</h3><p className="mt-2 max-w-[680px] text-sm leading-6 text-[#6f6859]">This record may contain medication information that could interact with a prescription already on file. Review the details before sharing it with a new provider.</p></div><button className="shrink-0 text-sm font-medium text-[#765b28] underline underline-offset-4">View details</button></div></section>
          <section id="how" className="mt-16 grid gap-8 border-y border-[#dfe5df] py-10 md:grid-cols-[1fr_2fr]"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#789181]">Active access</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">You control every share.</h2><p className="mt-3 text-sm leading-6 text-[#69776e]">Providers only see the records you choose, for as long as you choose.</p></div><div className="grid gap-6 sm:grid-cols-2">{grants.map(([name, role, expires]) => { const off = revoked.includes(name); return <div key={name} className={`${off ? 'opacity-50' : ''} border-l border-[#b8c9bb] pl-5`}><p className="text-sm font-medium">{name}</p><p className="mt-1 text-xs text-[#7d8981]">{role}</p><p className="mt-4 flex items-center gap-1.5 text-xs text-[#66746b]"><Clock3 className="size-3.5" />{off ? 'Access revoked' : expires}</p><button onClick={() => toggle(name)} className="mt-4 text-xs font-medium text-[#2c6045] underline underline-offset-4">{off ? 'Restore access' : 'Revoke access'}</button></div>})}</div></section>
          <section id="trust" className="mt-16 grid gap-8 bg-[#eaf0eb] p-7 sm:grid-cols-[auto_1fr] sm:items-center"><div className="flex size-20 items-center justify-center rounded-full border border-[#9db5a3] text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[#2c6045]">SOC 2<br />ready</div><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#789181]">Secure by design</p><h2 className="mt-2 text-xl font-semibold">Trust is built into every record.</h2><p className="mt-2 max-w-[620px] text-sm leading-6 text-[#69776e]">Encrypted storage, verifiable records, and a complete consent trail — designed for the highest standards of care.</p></div></section>
          <section className="relative mt-16 min-h-[300px] overflow-hidden bg-[#dfe8e1]"><img src="/medichain-clinic.png" alt="Quiet, softly lit clinical consultation room" className="absolute inset-0 size-full object-cover opacity-80" /><div className="relative max-w-[480px] bg-[#faf8f5]/90 p-8 sm:m-8"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#789181]">Care that moves with you</p><h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">One identity. Every care setting.</h2><p className="mt-3 text-sm leading-6 text-[#69776e]">Give your care team the context they need, without giving up control of your story.</p><button className="mt-5 flex items-center gap-2 text-sm font-medium text-[#2c6045]">Learn how it works <ArrowRight className="size-4" /></button></div></section>
        </>}
      </div></main>
    </div>
    {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1d1a]/35 p-4"><div role="dialog" aria-modal="true" aria-labelledby="grant-title" className="w-full max-w-[540px] bg-[#faf8f5] p-7 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#789181]">Step 1 of 2</p><h2 id="grant-title" className="mt-2 text-2xl font-semibold">Grant access</h2><p className="mt-2 text-sm text-[#69776e]">Choose a provider and the records they can view.</p></div><button onClick={() => setModal(false)} aria-label="Close dialog"><X className="size-5 text-[#6f7d73]" /></button></div><div className="mt-8 flex flex-col gap-4"><label className="text-sm font-medium">Provider<select className="mt-2 w-full border border-[#cbd8cd] bg-white p-3 text-sm"><option>Dr. Maya Chen · Northstar Health</option><option>Valley Imaging</option></select></label><label className="text-sm font-medium">Records to share<div className="mt-2 flex items-center gap-3 border border-[#cbd8cd] bg-white p-3 text-sm"><input type="checkbox" defaultChecked className="accent-[#1f3d2e]" /> Annual physical examination <Verified /></div><div className="mt-2 flex items-center gap-3 border border-[#cbd8cd] bg-white p-3 text-sm"><input type="checkbox" defaultChecked className="accent-[#1f3d2e]" /> Complete blood count <Verified /></div></label><button onClick={() => setModal(false)} className="mt-3 flex items-center justify-center gap-2 bg-[#1f3d2e] py-3 text-sm font-medium text-white">Continue <ArrowRight className="size-4" /></button></div></div></div>}
    {uploadModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1d1a]/35 p-4"><div role="dialog" aria-modal="true" aria-labelledby="upload-title" className="w-full max-w-[540px] bg-[#faf8f5] p-7 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#789181]">Upload record</p><h2 id="upload-title" className="mt-2 text-2xl font-semibold">Add a medical record</h2><p className="mt-2 text-sm text-[#69776e]">Your file will be encrypted and stored on IPFS with a hash anchored on the blockchain.</p></div><button onClick={() => { setUploadModal(false); setSelectedFile(null); }} aria-label="Close dialog"><X className="size-5 text-[#6f7d73]" /></button></div><div className="mt-8 flex flex-col gap-4"><label className="text-sm font-medium">Select file<input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="mt-2 w-full border border-[#cbd8cd] bg-white p-3 text-sm file:mr-4 file:rounded file:border-0 file:bg-[#1f3d2e] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white" /></label>{selectedFile && <div className="rounded border border-[#cbd8cd] bg-[#eaf0eb] p-3 text-sm"><p className="font-medium">{selectedFile.name}</p><p className="mt-1 text-xs text-[#69776e]">{(selectedFile.size / 1024).toFixed(2)} KB</p></div>}<button onClick={handleUpload} disabled={!selectedFile || recordsLoading} className="mt-3 flex items-center justify-center gap-2 bg-[#1f3d2e] py-3 text-sm font-medium text-white disabled:opacity-50">{recordsLoading ? 'Uploading...' : 'Upload & Encrypt'} <Upload className="size-4" /></button></div></div></div>}
  </div>
}
