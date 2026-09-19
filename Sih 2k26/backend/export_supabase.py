import json
import sqlite3
from pathlib import Path
from sqlalchemy.schema import CreateTable, CreateIndex
from sqlalchemy.dialects import postgresql
import app.models
from app.core.database import Base

def generate_sql():
    conn = sqlite3.connect('complygem.db')
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    lines = []
    lines.append('-- =======================================================')
    lines.append('-- ComplyGeM AI - Supabase / PostgreSQL Schema & Seed Data')
    lines.append('-- Generated for complete import into Supabase SQL Editor')
    lines.append('-- =======================================================\n')
    lines.append('BEGIN;\n')

    lines.append('-- Drop existing tables in reverse dependency order')
    for table in reversed(Base.metadata.sorted_tables):
        lines.append(f'DROP TABLE IF EXISTS \"{table.name}\" CASCADE;')
    lines.append('\n-- -------------------------------------------------------')
    lines.append('-- Tables Definition')
    lines.append('-- -------------------------------------------------------\n')

    for table in Base.metadata.sorted_tables:
        ddl = str(CreateTable(table).compile(dialect=postgresql.dialect())).strip()
        lines.append(ddl + ';\n')
        for idx in table.indexes:
            idx_ddl = str(CreateIndex(idx).compile(dialect=postgresql.dialect())).strip()
            lines.append(idx_ddl + ';')
        lines.append('')

    lines.append('\n-- -------------------------------------------------------')
    lines.append('-- Data Insertion')
    lines.append('-- -------------------------------------------------------\n')

    for table in Base.metadata.sorted_tables:
        tname = table.name
        col_names = [c.name for c in table.columns]
        col_types = {c.name: c.type for c in table.columns}
        
        try:
            rows = cur.execute(f'SELECT * FROM \"{tname}\" ORDER BY id ASC').fetchall()
        except Exception:
            continue
        
        if not rows:
            continue

        lines.append(f'-- Data for {tname} ({len(rows)} records)')
        cols_joined = ', '.join(f'\"{c}\"' for c in col_names)
        
        for row in rows:
            vals = []
            for c in col_names:
                val = row[c]
                if val is None:
                    vals.append('NULL')
                else:
                    col_type_str = str(col_types[c])
                    if 'BOOLEAN' in col_type_str.upper():
                        vals.append('TRUE' if val in (1, '1', True, 'true', 't') else 'FALSE')
                    elif any(num_t in col_type_str.upper() for num_t in ['INT', 'FLOAT', 'NUMERIC']):
                        vals.append(str(val))
                    elif 'JSON' in col_type_str.upper():
                        # Validate JSON string
                        s = str(val)
                        try:
                            # Re-dump to ensure valid JSON format
                            parsed = json.loads(s)
                            s = json.dumps(parsed)
                        except Exception:
                            pass
                        escaped = s.replace("'", "''")
                        vals.append(f"'{escaped}'::json")
                    else:
                        s = str(val).replace("'", "''")
                        vals.append(f"'{s}'")
            val_str = ", ".join(vals)
            lines.append(f'INSERT INTO "{tname}" ({cols_joined}) VALUES ({val_str});')
        lines.append('')

    lines.append('\n-- -------------------------------------------------------')
    lines.append('-- Reset SERIAL Sequences to latest ID')
    lines.append('-- -------------------------------------------------------\n')
    for table in Base.metadata.sorted_tables:
        tname = table.name
        lines.append(f"SELECT setval(pg_get_serial_sequence('{tname}', 'id'), COALESCE((SELECT MAX(id) FROM \"{tname}\"), 1));")

    lines.append('\nCOMMIT;\n')

    output_sql = '\n'.join(lines)
    Path('supabase_dump.sql').write_text(output_sql, encoding='utf-8')
    print(f'Successfully generated supabase_dump.sql ({len(output_sql)} bytes)')

if __name__ == '__main__':
    generate_sql()
