use crate::report::{self, Report};
use crate::xlsx;
use crate::AppState;
use rusqlite::params;
use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::State;

#[derive(Serialize)]
pub struct Stats {
    pub produse: usize,
    pub agenti_clienti: usize,
    pub agenti_distinct: usize,
    pub seed_version: Option<String>,
}

#[derive(Serialize)]
pub struct Produs {
    pub cod: String,
    pub denumire: String,
    pub grupa: String,
    pub subgrupa: String,
}

#[derive(Serialize)]
pub struct AgentClient {
    pub client: String,
    pub agent: String,
}

fn count(conn: &rusqlite::Connection, sql: &str) -> Result<usize, String> {
    conn.query_row(sql, [], |r| r.get(0))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_stats(state: State<AppState>) -> Result<Stats, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = &db.conn;
    let seed_version: Option<String> = conn
        .query_row(
            "SELECT valoare FROM meta WHERE cheie = 'seed_version'",
            [],
            |r| r.get(0),
        )
        .ok();
    Ok(Stats {
        produse: count(conn, "SELECT COUNT(*) FROM produse")?,
        agenti_clienti: count(conn, "SELECT COUNT(*) FROM agenti_clienti")?,
        agenti_distinct: count(conn, "SELECT COUNT(DISTINCT agent) FROM agenti_clienti")?,
        seed_version,
    })
}

#[tauri::command]
pub fn get_produse(
    state: State<AppState>,
    search: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<Produs>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let search = search.unwrap_or_default();
    let limit = limit.unwrap_or(50).clamp(1, 5000);
    let offset = offset.unwrap_or(0).max(0);

    let mut stmt = db
        .conn
        .prepare(
            "SELECT cod, denumire, grupa, subgrupa FROM produse
             WHERE (?1 = '' OR cod LIKE '%' || ?1 || '%' OR denumire LIKE '%' || ?1 || '%' OR grupa LIKE '%' || ?1 || '%')
             ORDER BY cod
             LIMIT ?2 OFFSET ?3",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![search, limit, offset], |r| {
            Ok(Produs {
                cod: r.get(0)?,
                denumire: r.get(1)?,
                grupa: r.get(2)?,
                subgrupa: r.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_agenti(
    state: State<AppState>,
    search: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<AgentClient>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let search = search.unwrap_or_default();
    let limit = limit.unwrap_or(50).clamp(1, 5000);
    let offset = offset.unwrap_or(0).max(0);

    let mut stmt = db
        .conn
        .prepare(
            "SELECT client, agent FROM agenti_clienti
             WHERE (?1 = '' OR client LIKE '%' || ?1 || '%' OR agent LIKE '%' || ?1 || '%')
             ORDER BY agent, client
             LIMIT ?2 OFFSET ?3",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![search, limit, offset], |r| {
            Ok(AgentClient {
                client: r.get(0)?,
                agent: r.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_produse(state: State<AppState>, path: String) -> Result<usize, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    xlsx::import_produse_file(&db.conn, Path::new(&path))
}

#[tauri::command]
pub fn import_agenti(state: State<AppState>, path: String) -> Result<usize, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    xlsx::import_agenti_file(&db.conn, Path::new(&path))
}

#[tauri::command]
pub fn update_produs(
    state: State<AppState>,
    cod: String,
    denumire: String,
    grupa: String,
    subgrupa: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.conn
        .execute(
            "UPDATE produse SET denumire = ?2, grupa = ?3, subgrupa = ?4 WHERE cod = ?1",
            params![cod, denumire, grupa, subgrupa],
        )
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_produs(state: State<AppState>, cod: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.conn
        .execute("DELETE FROM produse WHERE cod = ?1", params![cod])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_all_produse(state: State<AppState>) -> Result<usize, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.conn
        .execute("DELETE FROM produse", [])
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_agent(state: State<AppState>, client: String, agent: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.conn
        .execute(
            "UPDATE agenti_clienti SET agent = ?2 WHERE client = ?1",
            params![client, agent],
        )
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_agent(state: State<AppState>, client: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.conn
        .execute(
            "DELETE FROM agenti_clienti WHERE client = ?1",
            params![client],
        )
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_all_agenti(state: State<AppState>) -> Result<usize, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.conn
        .execute("DELETE FROM agenti_clienti", [])
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn genereaza_raport(
    state: State<'_, AppState>,
    path1: String,
    path2: String,
    an1: String,
    an2: String,
) -> Result<Report, String> {
    let (produse, agenti) = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        (
            report::load_produse(&db.conn)?,
            report::load_agenti(&db.conn)?,
        )
    };
    let p1 = PathBuf::from(path1);
    let p2 = PathBuf::from(path2);
    tauri::async_runtime::spawn_blocking(move || {
        report::build_report_with(produse, agenti, &p1, &p2, an1, an2)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn export_raport_data(report: Report, dest: String) -> Result<(), String> {
    let dest_path = PathBuf::from(dest);
    tauri::async_runtime::spawn_blocking(move || {
        crate::export::export_report(&report, &dest_path)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[derive(Serialize)]
pub struct RaportSalvat {
    pub id: i64,
    pub an1: String,
    pub an2: String,
    pub fisier1: String,
    pub fisier2: String,
    pub nr_clienti: i64,
    pub nr_agenti: i64,
    pub creat_la: String,
}

#[tauri::command]
pub fn salveaza_raport(
    state: State<AppState>,
    report: Report,
    fisier1: String,
    fisier2: String,
) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let date = serde_json::to_string(&report).map_err(|e| e.to_string())?;
    let nr_clienti = report.clienti.len() as i64;
    let nr_agenti = report.sumar.len() as i64;
    db.conn
        .execute(
            "INSERT INTO rapoarte_salvate
                (an1, an2, fisier1, fisier2, nr_clienti, nr_agenti, creat_la, date)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now', 'localtime'), ?7)",
            params![
                report.an1,
                report.an2,
                fisier1,
                fisier2,
                nr_clienti,
                nr_agenti,
                date
            ],
        )
        .map_err(|e| e.to_string())?;
    Ok(db.conn.last_insert_rowid())
}

#[tauri::command]
pub fn lista_rapoarte(state: State<AppState>) -> Result<Vec<RaportSalvat>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .conn
        .prepare(
            "SELECT id, an1, an2, fisier1, fisier2, nr_clienti, nr_agenti, creat_la
             FROM rapoarte_salvate ORDER BY id DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| {
            Ok(RaportSalvat {
                id: r.get(0)?,
                an1: r.get(1)?,
                an2: r.get(2)?,
                fisier1: r.get(3)?,
                fisier2: r.get(4)?,
                nr_clienti: r.get(5)?,
                nr_agenti: r.get(6)?,
                creat_la: r.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn incarca_raport(state: State<'_, AppState>, id: i64) -> Result<Report, String> {
    let date: String = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.conn
            .query_row(
                "SELECT date FROM rapoarte_salvate WHERE id = ?1",
                params![id],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?
    };
    tauri::async_runtime::spawn_blocking(move || {
        serde_json::from_str(&date).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn sterge_raport(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.conn
        .execute("DELETE FROM rapoarte_salvate WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
