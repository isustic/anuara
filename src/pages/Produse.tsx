import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Check, Package, Pencil, Trash2, Upload } from "lucide-react";
import {
  deleteAllProduse,
  deleteProdus,
  getProduse,
  importProduse,
  updateProdus,
  type Produs,
} from "../lib/api";
import { PAGE_SIZE, usePaged } from "../lib/usePaged";
import {
  ConfirmButton,
  Field,
  Modal,
  Pagination,
  TableCard,
  inputCls,
} from "../components/shared";
import { Spinner, ToastHost, useToasts, type ToastKind } from "../components/ui";

function EditProdusModal({
  row,
  push,
  onChanged,
  onClose,
}: {
  row: Produs;
  push: (kind: ToastKind, text: string) => void;
  onChanged: () => void;
  onClose: () => void;
}) {
  const [denumire, setDenumire] = useState(row.denumire);
  const [grupa, setGrupa] = useState(row.grupa);
  const [subgrupa, setSubgrupa] = useState(row.subgrupa);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateProdus(row.cod, denumire.trim(), grupa.trim(), subgrupa.trim());
      push("success", `Produsul ${row.cod} a fost actualizat.`);
      onChanged();
      onClose();
    } catch (e) {
      push("error", `Eroare la salvare: ${e}`);
      setSaving(false);
    }
  }

  async function del() {
    try {
      await deleteProdus(row.cod);
      push("success", `Produsul ${row.cod} a fost șters.`);
      onChanged();
      onClose();
    } catch (e) {
      push("error", `Eroare la ștergere: ${e}`);
    }
  }

  return (
    <Modal
      title="Editează produs"
      icon={<Package size={17} />}
      onClose={onClose}
      footer={
        <>
          <ConfirmButton
            onConfirm={del}
            label="Șterge"
            confirmLabel="Confirmă ștergerea"
            icon={<Trash2 size={15} />}
            className="px-3.5 py-2"
          />
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
              form="edit-produs-form"
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
        id="edit-produs-form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex flex-col gap-3.5"
      >
        <Field label="Cod" hint="Identificatorul nu poate fi modificat.">
          <input value={row.cod} disabled className={`${inputCls} font-mono`} />
        </Field>
        <Field label="Denumire">
          <input
            value={denumire}
            onChange={(e) => setDenumire(e.target.value)}
            className={inputCls}
            autoFocus
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Grupă">
            <input value={grupa} onChange={(e) => setGrupa(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Subgrupă">
            <input
              value={subgrupa}
              onChange={(e) => setSubgrupa(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

export default function Produse() {
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Produs | null>(null);
  const { toasts, push } = useToasts();
  const p = usePaged<Produs>(getProduse, version);

  async function doImport() {
    const file = await open({
      multiple: false,
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
    });
    if (!file) return;
    setBusy(true);
    try {
      const n = await importProduse(file as string);
      push("success", `${n.toLocaleString("ro-RO")} produse importate.`);
      setVersion((v) => v + 1);
    } catch (e) {
      push("error", `Eroare la import: ${e}`);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAll() {
    try {
      const n = await deleteAllProduse();
      push("success", `${n.toLocaleString("ro-RO")} produse șterse.`);
      p.setOffset(0);
      p.reload(p.search, 0);
    } catch (e) {
      push("error", `Eroare la ștergere: ${e}`);
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
            Produse
          </h2>
          <p className="mt-1 text-sm text-forest-600">
            Produse (cod → grupă) — datele folosite la generarea rapoartelor.
          </p>
        </div>
        <div className="flex gap-2.5">
          <ConfirmButton
            onConfirm={deleteAll}
            label="Șterge tot"
            confirmLabel="Confirmă ștergerea"
            icon={<Trash2 size={16} />}
          />
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
            Importă produse
          </button>
        </div>
      </div>

      <TableCard
        icon={<Package size={17} />}
        title="Produse (cod → grupă)"
        subtitle="apasă pe un rând pentru a-l edita"
        search={p.search}
        onSearch={p.setSearch}
        placeholder="cod, denumire sau grupă"
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
              <th className="px-5 py-2.5 font-semibold">Cod</th>
              <th className="px-4 py-2.5 font-semibold">Denumire</th>
              <th className="px-4 py-2.5 font-semibold">Grupă</th>
              <th className="px-4 py-2.5 font-semibold">Subgrupă</th>
              <th className="w-12 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-forest-50">
            {p.rows.map((r) => (
              <tr
                key={r.cod}
                onClick={() => setEditing(r)}
                className="group cursor-pointer transition-colors hover:bg-forest-50/60"
              >
                <td className="num px-5 py-2 font-mono text-xs text-forest-700">{r.cod}</td>
                <td className="px-4 py-2 text-forest-900">{r.denumire}</td>
                <td className="px-4 py-2">
                  <span className="inline-block rounded-full bg-forest-100 px-2.5 py-0.5 text-xs font-semibold text-forest-700">
                    {r.grupa}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-forest-500">{r.subgrupa}</td>
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
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-forest-400">
                  Nicio înregistrare găsită.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableCard>

      {editing && (
        <EditProdusModal
          row={editing}
          push={push}
          onChanged={() => p.reload(p.search, p.offset)}
          onClose={() => setEditing(null)}
        />
      )}

      <ToastHost toasts={toasts} />
    </div>
  );
}
