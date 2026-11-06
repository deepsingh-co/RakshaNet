import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Lock, CheckCircle2, Shield, Hash, Clock, Link2,
  FileText, Plus, AlertTriangle, Cpu,
} from "lucide-react";
import { Card, Pill } from "../../components/ui";
import { blockchainApi, EvidenceBlockDTO } from "../../api/endpoints";

export default function BlockchainWeb() {
  const [chain, setChain] = useState<EvidenceBlockDTO[]>([]);
  const [newEvidence, setNewEvidence] = useState({ type: "audio", desc: "" });
  const [chainValid, setChainValid] = useState<boolean | null>(null);

  useEffect(() => {
    loadChain();
  }, []);

  const loadChain = async () => {
    try {
      const data = await blockchainApi.getChain();
      setChain(data);
    } catch (err) {
      console.error("Failed to load blockchain", err);
    }
  };

  const addEvidence = async () => {
    try {
      const desc = newEvidence.desc || `Evidence #${chain.length + 1}`;
      await blockchainApi.addEvidence({ type: newEvidence.type, description: desc });
      setNewEvidence({ type: "audio", desc: "" });
      setChainValid(null);
      await loadChain();
    } catch (err) {
      console.error("Failed to add evidence", err);
    }
  };

  const verifyChain = async () => {
    try {
      const isValid = await blockchainApi.verifyChain();
      setChainValid(isValid);
    } catch (err) {
      console.error("Failed to verify chain", err);
    }
  };

  const tamperBlock = async (id: string) => {
    try {
      await blockchainApi.tamperBlock(id);
      setChainValid(false);
      await loadChain();
    } catch (err) {
      console.error("Failed to tamper block", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/app/features" className="p-2 glass-chip hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-pink-300">Legal Tech</div>
          <h1 className="text-3xl font-black">Blockchain Evidence Chain</h1>
          <p className="text-slate-400 text-sm mt-1">Court-admissible tamper-proof evidence</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card glow="pink">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-pink-300" />
              <span className="text-sm font-semibold">Cryptography: SHA-256 Hash Chain</span>
            </div>
            <p className="text-sm text-slate-400">
              Each block contains evidence hash + previous block hash. Tampering breaks the chain.
              Court-verified via cryptographic proof. Admissible under Indian Evidence Act Section 65B.
            </p>
          </Card>

          <Card>
            <div className="text-sm font-bold mb-3">Add Evidence to Chain</div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { k: "audio", l: "Audio", i: "🎤" },
                { k: "video", l: "Video", i: "📹" },
                { k: "photo", l: "Photo", i: "📷" },
                { k: "gps", l: "GPS Log", i: "📍" },
              ].map((t) => (
                <button
                  key={t.k}
                  onClick={() => setNewEvidence({ ...newEvidence, type: t.k })}
                  className={`p-3 rounded-xl border transition ${
                    newEvidence.type === t.k
                      ? "bg-pink-500/20 border-pink-400/40"
                      : "bg-white/5 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="text-2xl mb-1">{t.i}</div>
                  <div className="text-xs font-semibold">{t.l}</div>
                </button>
              ))}
            </div>
            <input
              value={newEvidence.desc}
              onChange={(e) => setNewEvidence({ ...newEvidence, desc: e.target.value })}
              placeholder="Description (e.g., 'Voice recording of threat')"
              className="w-full glass px-4 py-2.5 rounded-xl text-sm outline-none border border-transparent focus:border-pink-400/40 mb-3"
            />
            <button
              onClick={addEvidence}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add to Chain
            </button>
          </Card>

          {chain.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Evidence Chain ({chain.length} blocks)</h3>
                <div className="flex gap-2">
                  <button
                    onClick={verifyChain}
                    className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-200 text-xs font-bold hover:bg-emerald-500/30 flex items-center gap-1"
                  >
                    <Shield className="w-3.5 h-3.5" /> Verify
                  </button>
                </div>
              </div>

              {chainValid !== null && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card glow={chainValid ? "emerald" : "pink"}>
                    <div className="flex items-center gap-3">
                      {chainValid ? (
                        <>
                          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                          <div>
                            <div className="font-bold text-emerald-200">✓ Chain Valid</div>
                            <div className="text-xs text-emerald-300/70">All {chain.length} blocks verified. Court-admissible.</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-8 h-8 text-red-400" />
                          <div>
                            <div className="font-bold text-red-200">⚠ Chain Tampered</div>
                            <div className="text-xs text-red-300/70">Integrity compromised. Evidence may be invalid.</div>
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                </motion.div>
              )}

              <div className="space-y-3">
                {chain.map((block, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 grid place-items-center text-white font-black">
                          #{block.blockIndex}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold">{block.description}</span>
                            <Pill tone="violet">{block.type.toUpperCase()}</Pill>
                            {!block.tampered && <Pill tone="emerald">VERIFIED</Pill>}
                          </div>
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {new Date(block.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="glass p-2 rounded-lg">
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                            <Hash className="w-3 h-3" /> Block Hash
                          </div>
                          <div className="text-[11px] font-mono text-pink-300 break-all">{block.hash}</div>
                        </div>
                        {block.blockIndex > 1 && (
                          <div className="glass p-2 rounded-lg">
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                              <Link2 className="w-3 h-3" /> Previous Hash
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 break-all">{block.prevHash}</div>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => tamperBlock(block.id)}
                        className="mt-3 text-[11px] text-red-300 hover:text-red-200 flex items-center gap-1"
                      >
                        <AlertTriangle className="w-3 h-3" /> Simulate tampering (demo)
                      </button>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </>
          )}

          {chain.length === 0 && (
            <Card>
              <div className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-pink-500/10 grid place-items-center mx-auto mb-3">
                  <FileText className="w-8 h-8 text-pink-300" />
                </div>
                <div className="text-sm text-slate-400">No evidence yet. Add first block to start chain.</div>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <div className="text-sm font-bold mb-3">How it works</div>
            <div className="space-y-2 text-xs">
              {[
                { n: "1", t: "Capture", d: "Audio/video/GPS recorded" },
                { n: "2", t: "Hash", d: "SHA-256 fingerprint generated" },
                { n: "3", t: "Link", d: "Hash + previous hash stored" },
                { n: "4", t: "Verify", d: "Chain integrity check" },
              ].map((s) => (
                <div key={s.n} className="flex gap-3 glass p-2 rounded-lg">
                  <div className="text-xl font-black text-gradient-pink">{s.n}</div>
                  <div>
                    <div className="font-semibold">{s.t}</div>
                    <div className="text-slate-400">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-bold mb-3">Legal Validity</div>
            <div className="space-y-2 text-xs">
              {[
                { t: "Indian Evidence Act", d: "Section 65B compliant" },
                { t: "IT Act 2000", d: "Electronic evidence valid" },
                { t: "Bharatiya Sakshya Adhiniyam", d: "New criminal law 2024" },
                { t: "Court Precedents", d: "Arjun Panditrao case" },
              ].map((l) => (
                <div key={l.t} className="glass p-2 rounded-lg">
                  <div className="font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-300" /> {l.t}
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">{l.d}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-pink-300" />
              <span className="text-sm font-bold">Cryptographic Proof</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Each block's hash depends on previous block. Any change breaks the chain — instantly detectable by any court verifier.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
