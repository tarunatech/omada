import { PoolClient } from 'pg';

/**
 * Syncs a product from a quotation item to the master_products table.
 * If the product exists, it updates the image if not already set.
 */
export async function syncProductToMaster(client: PoolClient, item: any, source: string) {
    const company = item.company?.trim();
    const design = item.design?.trim();
    const finish = item.finish?.trim() || '';
    const size = item.size?.trim() || '';
    const weight = item.weight?.trim() || null;

    if (company && design) {
        // Find existing product case-insensitively
        const findRes = await client.query(`
            SELECT id, image, weight FROM master_products
            WHERE LOWER(TRIM(company)) = LOWER($1)
              AND LOWER(TRIM(design)) = LOWER($2)
              AND LOWER(TRIM(COALESCE(finish, ''))) = LOWER($3)
              AND LOWER(TRIM(COALESCE(size, ''))) = LOWER($4)
            LIMIT 1
        `, [company, design, finish, size]);

        if (findRes.rows.length > 0) {
            const existing = findRes.rows[0];
            const newImage = existing.image || item.image || null;
            const newWeight = existing.weight || weight || null;
            if (newImage !== existing.image || newWeight !== existing.weight) {
                await client.query(`
                    UPDATE master_products
                    SET image = $1, weight = $2
                    WHERE id = $3
                `, [newImage, newWeight, existing.id]);
            }
            return existing;
        } else {
            const insertResult = await client.query(`
                INSERT INTO master_products (company, design, finish, size, weight, image)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, design
            `, [company, design, finish, size, weight, item.image || null]);
            return insertResult.rows[0];
        }
    }
    return null;
}

/**
 * Updates the total_quantity_used for a product in master_products.
 * Currently disabled as usage is calculated dynamically in the controller.
 */
export async function updateProductUsage(client: PoolClient, item: any, delta: number) {
    // Usage is calculated on-the-fly in master.controller.ts
    return;
}

/**
 * Maps snake_case database row to camelCase object.
 */
export function mapRow(row: any, mapping: Record<string, string>) {
    const result: any = {};
    for (const [rowKey, objKey] of Object.entries(mapping)) {
        result[objKey] = row[rowKey];
    }
    return result;
}

export function toCamelCase(str: string) {
    return str.replace(/([-_][a-z])/g, group =>
        group.toUpperCase().replace('-', '').replace('_', '')
    );
}

export function mapRowsToCamelCase(rows: any[]) {
    return rows.map(row => {
        const newRow: any = {};
        for (const key in row) {
            newRow[toCamelCase(key)] = row[key];
        }
        return newRow;
    });
}
