import { invoke } from "@tauri-apps/api/core";

export type Stats = {
  produse: number;
  agenti_clienti: number;
  agenti_distinct: number;
  seed_version: string | null;
};

export type Produs = {
  cod: string;
  denumire: string;
  grupa: string;
  subgrupa: string;
};

export type AgentClient = {
  client: string;
  agent: string;
};

export function getStats(): Promise<Stats> {
  return invoke<Stats>("get_stats");
}

export function getProduse(
  search?: string,
  limit?: number,
  offset?: number,
): Promise<Produs[]> {
  return invoke<Produs[]>("get_produse", { search, limit, offset });
}

export function getAgenti(
  search?: string,
  limit?: number,
  offset?: number,
): Promise<AgentClient[]> {
  return invoke<AgentClient[]>("get_agenti", { search, limit, offset });
}

export function importProduse(path: string): Promise<number> {
  return invoke<number>("import_produse", { path });
}

export function importAgenti(path: string): Promise<number> {
  return invoke<number>("import_agenti", { path });
}

export function updateProdus(
  cod: string,
  denumire: string,
  grupa: string,
  subgrupa: string,
): Promise<void> {
  return invoke<void>("update_produs", { cod, denumire, grupa, subgrupa });
}

export function deleteProdus(cod: string): Promise<void> {
  return invoke<void>("delete_produs", { cod });
}

export function deleteAllProduse(): Promise<number> {
  return invoke<number>("delete_all_produse");
}

export function updateAgent(client: string, agent: string): Promise<void> {
  return invoke<void>("update_agent", { client, agent });
}

export function deleteAgent(client: string): Promise<void> {
  return invoke<void>("delete_agent", { client });
}

export function deleteAllAgenti(): Promise<number> {
  return invoke<number>("delete_all_agenti");
}

export type RandClient = {
  client: string;
  agent: string;
  valori: [number, number][];
  nou: boolean;
};

export type RandSumar = {
  agent: string;
  valori: [number, number][];
};

export type Report = {
  an1: string;
  an2: string;
  coloane: string[];
  clienti: RandClient[];
  sumar: RandSumar[];
  agenti: string[];
};

export function genereazaRaport(
  path1: string,
  path2: string,
  an1: string,
  an2: string,
): Promise<Report> {
  return invoke<Report>("genereaza_raport", { path1, path2, an1, an2 });
}

export function exportRaportData(report: Report, dest: string): Promise<void> {
  return invoke<void>("export_raport_data", { report, dest });
}

export type RaportSalvat = {
  id: number;
  an1: string;
  an2: string;
  fisier1: string;
  fisier2: string;
  nr_clienti: number;
  nr_agenti: number;
  creat_la: string;
};

export function salveazaRaport(
  report: Report,
  fisier1: string,
  fisier2: string,
): Promise<number> {
  return invoke<number>("salveaza_raport", { report, fisier1, fisier2 });
}

export function listaRapoarte(): Promise<RaportSalvat[]> {
  return invoke<RaportSalvat[]>("lista_rapoarte");
}

export function incarcaRaport(id: number): Promise<Report> {
  return invoke<Report>("incarca_raport", { id });
}

export function stergeRaport(id: number): Promise<void> {
  return invoke<void>("sterge_raport", { id });
}
