import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Check, Pencil, Trash2, Upload, UserCheck } from "lucide-react";
import {
  deleteAgent,
  deleteAllAgenti,
  getAgenti,
  importAgenti,
  updateAgent,
  type AgentClient,
} from "../lib/api";
import { PAGE_SIZE, usePaged } from "../lib/usePaged";
import {
  ConfirmDeleteModal,
  Field,
  Modal,
  Pagination,
  TableCard,
  inputCls,
} from "../components/shared";
import { Spinner, ToastHost, useToasts, type ToastKind } from "../components/ui";

function EditAgentModal({
  row,
  push,
  onChanged,
  onClose,
}: {
  row: AgentClient;
  push: (kind: ToastKind, text: string) => void;
  onChanged: () => void;
  onClose: () => void;
}) {
  const [agent, setAgent] = useState(row.agent);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateAgent(row.client, agent.trim());
      push("success", `Clientul ${row.client} a fost actualizat.`);
      onChanged();
      onClose();
    } catch (e) {
      push("error", `Eroare la salvare: ${e}`);
      setSaving(false);
    }
  }

  async function del() {
    try {
      await deleteAgent(row.client);
      push("success", `Clientul ${row.client} a fost șters.`);
      onChanged();
      onClose();
    } catch (e) {
      push("error", `Eroare la ștergere: ${e}`);
      throw e;
    }
  }

  return (
    <>
    <Modal
      title="Editează client"
      icon={<UserCheck size={17} />}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:border-red-400 hover:bg-red-50 active:scale-[0.98]"
          >
            <Trash2 size={15} />
            Șterge
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-forest-200 bg-white px-4 py-2 text-sm font-semibold text-forest-700 transition hover:border-forest-400 hover:bg-forest-50"
            >
              Anulează
            </button>
            <button
              type="submit"
              form="edit-agent-form"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-forest-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-700 active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? <Spinner /> : <Check size={15} />}
              Salvează
            </button>
          </div>
        </>
      }
    >
      <form
        id="edit-agent-form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex flex-col gap-3.5"
      >
        <Field label="Client" hint="Identificatorul nu poate fi modificat.">
          <input value={row.client} disabled className={inputCls} />
        </Field>
        <Field label="Agent">
          <input
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            className={inputCls}
            autoFocus
          />
        </Field>
      </form>
    </Modal>
    {confirming && (
      <ConfirmDeleteModal
        title="Ștergi acest client?"
        description="Clientul și asocierea lui cu agentul vor fi eliminate definitiv din fondul de date."
        entity={row.client}
        onConfirm={del}
        onClose={() => setConfirming(false)}
      />
    )}
    </>
  );
}

export default function Clienti() {
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<AgentClient | null>(null);
  const [confirmingAll, setConfirmingAll] = useState(false);
  const { toasts, push } = useToasts();
  const p = usePaged<AgentClient>(getAgenti, version);

  async function doImport() {
    const file = await open({
      multiple: false,
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
    });
    if (!file) return;
    setBusy(true);
    try {
      const n = await importAgenti(file as string);
      push("success", `${n.toLocaleString("ro-RO")} clienți/agenți importate.`);
      setVersion((v) => v + 1);
    } catch (e) {
      push("error", `Eroare la import: ${e}`);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAll() {
    try {
      const n = await deleteAllAgenti();
      push("success", `${n.toLocaleString("ro-RO")} clienți/agenți șterse.`);
      p.setOffset(0);
      p.reload(p.search, 0);
      setConfirmingAll(false);
    } catch (e) {
      push("error", `Eroare la ștergere: ${e}`);
      throw e;
    }
  }

  return (
    <div className="flex flex-col gap-6 p-7">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-600">
            Fondul de date
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-forest-950">
            Clienți
          </h2>
          <p className="mt-1 text-sm text-forest-600">
            Clienți → Agent — cine gestionează fiecare client.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => setConfirmingAll(true)}
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition hover:border-red-400 hover:bg-red-50 active:scale-[0.98]"
          >
            <Trash2 size={16} />
            Șterge tot
          </button>
          <button
            onClick={doImport}
            disabled={busy}
            className="group flex items-center gap-2 rounded-xl border border-forest-200 bg-white px-4 py-2.5 text-sm font-semibold text-forest-800 shadow-sm transition hover:border-forest-400 hover:shadow active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? (
              <Spinner />
            ) : (
              <Upload size={16} className="text-forest-500 transition group-hover:text-amber-600" />
            )}
            Importă clienți/agenți
          </button>
        </div>
      </div>

      <TableCard
        icon={<UserCheck size={17} />}
        title="Clienți → Agent"
        subtitle="apasă pe un rând pentru a-l edita"
        search={p.search}
        onSearch={p.setSearch}
        placeholder="client sau agent"
        error={p.error}
        footer={
          <Pagination
            offset={p.offset}
            hasMore={p.hasMore}
            loading={p.loading}
            onPrev={() => {
              const o = Math.max(0, p.offset - PAGE_SIZE);
              p.setOffset(o);
              p.reload(p.search, o);
            }}
            onNext={() => {
              const o = p.offset + PAGE_SIZE;
              p.setOffset(o);
              p.reload(p.search, o);
            }}
          />
        }
      >
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-forest-50 text-[11px] uppercase tracking-wide text-forest-500">
            <tr>
              <th className="px-5 py-2.5 font-semibold">Client</th>
              <th className="px-4 py-2.5 font-semibold">Agent</th>
              <th className="w-12 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-forest-50">
            {p.rows.map((r) => (
              <tr
                key={r.client}
                onClick={() => setEditing(r)}
                className="group cursor-pointer transition-colors hover:bg-forest-50/60"
              >
                <td className="px-5 py-2 font-medium text-forest-900">{r.client}</td>
                <td className="px-4 py-2 text-forest-600">{r.agent}</td>
                <td className="px-3 py-2 text-right">
                  <Pencil
                    size={14}
                    className="ml-auto text-forest-300 opacity-0 transition group-hover:opacity-100 group-hover:text-forest-500"
                  />
                </td>
              </tr>
            ))}
            {p.rows.length === 0 && !p.loading && (
              <tr>
                <td colSpan={3} className="px-5 py-10 text-center text-sm text-forest-400">
                  Nicio înregistrare găsită.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableCard>

      {editing && (
        <EditAgentModal
          row={editing}
          push={push}
          onChanged={() => p.reload(p.search, p.offset)}
          onClose={() => setEditing(null)}
        />
      )}

      {confirmingAll && (
        <ConfirmDeleteModal
          title="Ștergi toți clienții?"
          description="Întregul tabel de clienți și agenți va fi golit. Poți reimporta oricând fișierul Excel pentru a-l reconstitui."
          confirmLabel="Șterge tot"
          busyLabel="Se golește…"
          onConfirm={deleteAll}
          onClose={() => setConfirmingAll(false)}
        />
      )}

      <ToastHost toasts={toasts} />
    </div>
  );
}
