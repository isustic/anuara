use calamine::{open_workbook, Data, Reader, Xlsx};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::path::Path;

#[derive(Clone, Serialize, Deserialize)]
pub struct RandClient {
    pub client: String,
    pub agent: String,
    pub valori: Vec<(f64, f64)>,
    pub nou: bool,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct RandSumar {
    pub agent: String,
    pub valori: Vec<(f64, f64)>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Report {
    pub an1: String,
    pub an2: String,
    pub coloane: Vec<String>,
    pub clienti: Vec<RandClient>,
    pub sumar: Vec<RandSumar>,
    pub agenti: Vec<String>,
}

fn make_label(grupa: &str, subgrupa: &str) -> String {
    let s = subgrupa.to_lowercase();
    if s.contains("tehnic") {
        format!("{} - Tehnic", grupa)
    } else if s.contains("retail") {
        format!("{} - Retail", grupa)
    } else {
        grupa.to_string()
    }
}

pub fn load_produse(conn: &Connection) -> Result<HashMap<String, (String, String)>, String> {
    let mut stmt = conn
        .prepare("SELECT cod, grupa, subgrupa FROM produse")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| {
            Ok((
                r.get::<_, String>(0)?,
                (r.get::<_, String>(1)?, r.get::<_, String>(2)?),
            ))
        })
        .map_err(|e| e.to_string())?;
    let mut map = HashMap::new();
    for row in rows {
        let (cod, rest) = row.map_err(|e| e.to_string())?;
        map.insert(cod, rest);
    }
    Ok(map)
}

pub fn load_agenti(conn: &Connection) -> Result<HashMap<String, String>, String> {
    let mut stmt = conn
        .prepare("SELECT client, agent FROM agenti_clienti")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?;
    let mut map = HashMap::new();
    for row in rows {
        let (client, agent) = row.map_err(|e| e.to_string())?;
        map.insert(client, agent);
    }
    Ok(map)
}

fn cell_str(cell: Option<&Data>) -> Option<String> {
    match cell? {
        Data::Empty => None,
        Data::String(s) => {
            let t = s.trim();
            if t.is_empty() {
                None
            } else {
                Some(t.to_string())
            }
        }
        Data::Int(i) => Some(i.to_string()),
        Data::Float(f) => {
            if f.fract() == 0.0 && f.abs() < 9.0e15 {
                Some(format!("{}", *f as i64))
            } else {
                Some(format!("{}", f))
            }
        }
        Data::Bool(b) => Some(b.to_string()),
        _ => None,
    }
}

fn cell_num(cell: Option<&Data>) -> Option<f64> {
    match cell? {
        Data::Int(i) => Some(*i as f64),
        Data::Float(f) => Some(*f),
        Data::String(s) => s.trim().parse::<f64>().ok(),
        Data::Bool(b) => Some(if *b { 1.0 } else { 0.0 }),
        _ => None,
    }
}

fn at<'a>(row: &'a [Data], start_col: usize, abs: usize) -> Option<&'a Data> {
    abs.checked_sub(start_col).and_then(|i| row.get(i))
}

fn accumulate(
    path: &Path,
    produse: &HashMap<String, (String, String)>,
    out: &mut HashMap<(String, String), f64>,
    labels: &mut BTreeSet<String>,
) -> Result<(), String> {
    let mut wb: Xlsx<_> = open_workbook(path).map_err(|e| format!("deschidere xlsx: {e}"))?;
    let name = wb
        .sheet_names()
        .first()
        .cloned()
        .ok_or_else(|| "fișierul nu are niciun sheet".to_string())?;
    let range = wb
        .worksheet_range(&name)
        .map_err(|e| format!("citire sheet: {e}"))?;
    let start_col = range.start().map(|(_, c)| c as usize).unwrap_or(0);

    for (i, row) in range.rows().enumerate() {
        if i == 0 {
            continue;
        }
        let src_grupa = cell_str(at(row, start_col, 1)); // B = Denumire grupa
        let cod = cell_str(at(row, start_col, 4)); // E = Cod
        let client = cell_str(at(row, start_col, 15)); // P = Client
        let valoare = cell_num(at(row, start_col, 9)); // J = Valoare Contabila
        if cod.as_deref() == Some("Cod") {
            continue;
        }
        let (Some(cod), Some(client), Some(v)) = (cod, client, valoare) else {
            continue;
        };

        let label = match produse.get(&cod) {
            Some((grupa, subgrupa)) if !grupa.trim().is_empty() => make_label(grupa, subgrupa),
            _ => src_grupa.unwrap_or_else(|| "Necunoscut".to_string()),
        };

        labels.insert(label.clone());
        *out.entry((client, label)).or_insert(0.0) += v;
    }
    Ok(())
}

pub fn build_report_with(
    produse: HashMap<String, (String, String)>,
    agenti: HashMap<String, String>,
    path1: &Path,
    path2: &Path,
    an1: String,
    an2: String,
) -> Result<Report, String> {
    let mut sum1: HashMap<(String, String), f64> = HashMap::new();
    let mut sum2: HashMap<(String, String), f64> = HashMap::new();
    let mut labels: BTreeSet<String> = BTreeSet::new();
    accumulate(path1, &produse, &mut sum1, &mut labels)?;
    accumulate(path2, &produse, &mut sum2, &mut labels)?;

    let coloane: Vec<String> = labels.into_iter().collect();
    let ncol = coloane.len();
    let col_index: HashMap<&str, usize> =
        coloane.iter().enumerate().map(|(i, n)| (n.as_str(), i)).collect();

    let mut by1: HashMap<String, Vec<f64>> = HashMap::new();
    for ((client, label), v) in sum1 {
        let Some(&idx) = col_index.get(label.as_str()) else {
            continue;
        };
        let row = by1.entry(client).or_insert_with(|| vec![0.0; ncol]);
        row[idx] += v;
    }
    let mut by2: HashMap<String, Vec<f64>> = HashMap::new();
    for ((client, label), v) in sum2 {
        let Some(&idx) = col_index.get(label.as_str()) else {
            continue;
        };
        let row = by2.entry(client).or_insert_with(|| vec![0.0; ncol]);
        row[idx] += v;
    }

    let base_clients: BTreeSet<String> = by2.keys().cloned().collect();
    let an1_clients: BTreeSet<String> = by1.keys().cloned().collect();

    let mut clienti: Vec<RandClient> = Vec::new();
    for client in base_clients {
        let v2 = match by2.get(&client) {
            Some(r) => r,
            None => continue,
        };
        let v1 = by1.get(&client);
        let mut valori: Vec<(f64, f64)> = Vec::with_capacity(ncol);
        let mut any = false;
        for i in 0..ncol {
            let a = v1.map(|r| r[i]).unwrap_or(0.0);
            let b = v2[i];
            if a.abs() > 1e-9 || b.abs() > 1e-9 {
                any = true;
            }
            valori.push((a, b));
        }
        if !any {
            continue;
        }
        let agent = agenti
            .get(&client)
            .cloned()
            .filter(|a| !a.trim().is_empty())
            .unwrap_or_else(|| "Fără agent".to_string());
        let nou = !an1_clients.contains(&client);
        clienti.push(RandClient {
            client,
            agent,
            valori,
            nou,
        });
    }

    clienti.sort_by(|a, b| a.agent.cmp(&b.agent).then_with(|| a.client.cmp(&b.client)));

    let mut sumar_map: BTreeMap<String, Vec<(f64, f64)>> = BTreeMap::new();
    for c in &clienti {
        let entry = sumar_map
            .entry(c.agent.clone())
            .or_insert_with(|| vec![(0.0, 0.0); ncol]);
        for (i, v) in c.valori.iter().enumerate() {
            entry[i].0 += v.0;
            entry[i].1 += v.1;
        }
    }
    let sumar: Vec<RandSumar> = sumar_map
        .into_iter()
        .map(|(agent, valori)| RandSumar { agent, valori })
        .collect();
    let agenti: Vec<String> = sumar.iter().map(|s| s.agent.clone()).collect();

    Ok(Report {
        an1,
        an2,
        coloane,
        clienti,
        sumar,
        agenti,
    })
}

pub fn build_report(
    conn: &Connection,
    path1: &Path,
    path2: &Path,
    an1: String,
    an2: String,
) -> Result<Report, String> {
    let produse = load_produse(conn)?;
    let agenti = load_agenti(conn)?;
    build_report_with(produse, agenti, path1, path2, an1, an2)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn write_source(path: &Path, rows: &[(&str, &str, f64)]) {
        let mut wb = rust_xlsxwriter::Workbook::new();
        let ws = wb.add_worksheet();
        ws.write_string(0, 4, "Cod").unwrap();
        ws.write_string(0, 9, "Valoare Contabila").unwrap();
        ws.write_string(0, 15, "Client").unwrap();
        for (i, (cod, client, val)) in rows.iter().enumerate() {
            let r = i as u32 + 1;
            ws.write_string(r, 4, *cod).unwrap();
            ws.write_number(r, 9, *val).unwrap();
            ws.write_string(r, 15, *client).unwrap();
        }
        wb.save(path).unwrap();
    }

    #[test]
    fn build_and_export_report() {
        let conn = crate::db::test_conn();
        conn.execute_batch(
            "INSERT INTO produse (cod, denumire, grupa, subgrupa) VALUES
               ('X1', 'OI PROD', 'OI', 'Haircare retail'),
               ('X2', 'OI TECH', 'OI', 'Haircare tehnic'),
               ('X3', 'MORE PROD', 'MORE INSIDE', 'Styling'),
               ('X4', 'OI PROD 2', 'OI', 'Haircare retail'),
               ('X5', 'OI PROD 3', 'OI', 'Haircare retail');
             INSERT INTO agenti_clienti (client, agent) VALUES
               ('CLIENT1', 'Agent A'),
               ('CLIENT2', 'Agent B'),
               ('CLIENT3', 'Agent A'),
               ('CLIENT4', 'Agent B');",
        )
        .unwrap();

        let dir = std::env::temp_dir();
        let p1 = dir.join("rap_test_2025.xlsx");
        let p2 = dir.join("rap_test_2026.xlsx");
        write_source(
            &p1,
            &[
                ("X1", "CLIENT1", 100.0),
                ("X2", "CLIENT1", 50.0),
                ("X3", "CLIENT2", 200.0),
                ("X5", "CLIENT4", 999.0),
            ],
        );
        write_source(
            &p2,
            &[
                ("X1", "CLIENT1", 120.0),
                ("X3", "CLIENT2", 180.0),
                ("X4", "CLIENT3", 300.0),
            ],
        );

        let report = build_report(&conn, &p1, &p2, "2025".into(), "2026".into()).unwrap();

        let idx = |name: &str| report.coloane.iter().position(|c| c == name).unwrap();
        let oi_r = idx("OI - Retail");
        let oi_t = idx("OI - Tehnic");
        let more = idx("MORE INSIDE");

        let c1 = report.clienti.iter().find(|c| c.client == "CLIENT1").unwrap();
        assert_eq!(c1.agent, "Agent A");
        assert!(!c1.nou);
        assert!((c1.valori[oi_r].0 - 100.0).abs() < 1e-6);
        assert!((c1.valori[oi_r].1 - 120.0).abs() < 1e-6);
        assert!((c1.valori[oi_t].0 - 50.0).abs() < 1e-6);
        assert!((c1.valori[oi_t].1 - 0.0).abs() < 1e-6);

        let c2 = report.clienti.iter().find(|c| c.client == "CLIENT2").unwrap();
        assert_eq!(c2.agent, "Agent B");
        assert!(!c2.nou);
        assert!((c2.valori[more].0 - 200.0).abs() < 1e-6);
        assert!((c2.valori[more].1 - 180.0).abs() < 1e-6);

        let c3 = report.clienti.iter().find(|c| c.client == "CLIENT3").unwrap();
        assert!(c3.nou);
        assert!((c3.valori[oi_r].0 - 0.0).abs() < 1e-6);
        assert!((c3.valori[oi_r].1 - 300.0).abs() < 1e-6);

        assert!(report.clienti.iter().all(|c| c.client != "CLIENT4"));

        let sa = report.sumar.iter().find(|s| s.agent == "Agent A").unwrap();
        assert!((sa.valori[oi_r].0 - 100.0).abs() < 1e-6);
        assert!((sa.valori[oi_r].1 - 420.0).abs() < 1e-6);

        let out = dir.join("rap_test_out.xlsx");
        crate::export::export_report(&report, &out).unwrap();
        assert!(out.exists());

        let wb: Xlsx<_> = open_workbook(&out).unwrap();
        let names = wb.sheet_names();
        assert!(names.iter().any(|n| n == "SUMAR"));
        assert!(names.iter().any(|n| n == "2026 vs 2025"));
        assert!(names.iter().any(|n| n == "Agent A"));
        assert!(names.iter().any(|n| n == "Agent B"));

        let _ = std::fs::remove_file(&p1);
        let _ = std::fs::remove_file(&p2);
        let _ = std::fs::remove_file(&out);
    }

    #[test]
    fn report_json_roundtrip() {
        let report = Report {
            an1: "2025".into(),
            an2: "2026".into(),
            coloane: vec!["A".into(), "B".into()],
            clienti: vec![RandClient {
                client: "C1".into(),
                agent: "Agent A".into(),
                valori: vec![(1.0, 2.0), (3.5, 0.0)],
                nou: true,
            }],
            sumar: vec![RandSumar {
                agent: "Agent A".into(),
                valori: vec![(1.0, 2.0), (3.5, 0.0)],
            }],
            agenti: vec!["Agent A".into()],
        };
        let json = serde_json::to_string(&report).unwrap();
        let back: Report = serde_json::from_str(&json).unwrap();
        assert_eq!(back.an1, "2025");
        assert_eq!(back.an2, "2026");
        assert_eq!(back.coloane, report.coloane);
        assert_eq!(back.clienti.len(), 1);
        assert_eq!(back.clienti[0].client, "C1");
        assert!(back.clienti[0].nou);
        assert!((back.clienti[0].valori[1].0 - 3.5).abs() < 1e-9);
        assert!((back.sumar[0].valori[0].1 - 2.0).abs() < 1e-9);
        assert_eq!(back.agenti, report.agenti);
    }
}
