import { PoolClient } from 'pg';

/**
 * Syncs a product from a quotation item to the master_products table.
 * If the product exists, it updates the image if not already set.
 */
export async function syncProductToMaster(client: PoolClient, item: any, source: string) {
    const company = item.company?.trim();
    const design = item.design?.trim();
    const finish = item.finish?.trim() || null;
    const size = item.size?.trim() || null;

    if (company && design) {
        // We use a specific UPSERT logic that handles NULLs and casing consistently
        const upsertResult = await client.query(`
            INSERT INTO master_products (company, design, finish, size, image)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (TRIM(LOWER(company)), TRIM(LOWER(design)), COALESCE(TRIM(LOWER(finish)), ''), COALESCE(TRIM(LOWER(size)), '')) 
            DO UPDATE SET image = COALESCE(master_products.image, EXCLUDED.image)
            RETURNING id, design
        `, [company, design, finish, size, item.image]);
        return upsertResult.rows[0];
    }
    return null;
}

/**
 * Updates the total_quantity_used for a product in master_products.
 */
export async function updateProductUsage(client: PoolClient, item: any, delta: number) {
    const company = item.company?.trim();
    const design = item.design?.trim();
    const finish = item.finish?.trim() || null;
    const size = item.size?.trim() || null;

    if (company && design) {
        // Optimized to use the new composite index and handle NULLs consistently
        await client.query(`
            UPDATE master_products 
            SET total_quantity_used = GREATEST(0, total_quantity_used + $1)
            WHERE TRIM(LOWER(company)) = TRIM(LOWER($2)) 
              AND TRIM(LOWER(design)) = TRIM(LOWER($3)) 
              AND COALESCE(TRIM(LOWER(finish)), '') = COALESCE(TRIM(LOWER($4)), '')
              AND COALESCE(TRIM(LOWER(size)), '') = COALESCE(TRIM(LOWER($5)), '')
        `, [delta, company, design, finish, size]);
    }
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
