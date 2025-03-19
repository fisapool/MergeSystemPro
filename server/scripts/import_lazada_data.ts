import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { lazadaImportSchema, type LazadaImport } from '@shared/schema';
import { storage } from '../storage';

export async function importLazadaProducts(filePath: string, userId: number) {
  return new Promise((resolve, reject) => {
    const results: LazadaImport[] = [];
    
    createReadStream(filePath)
      .pipe(parse({
        columns: true,
        skip_empty_lines: true
      }))
      .on('data', async (row) => {
        try {
          // Parse and validate the row data
          const product = lazadaImportSchema.parse({
            lazadaId: row.lazada_id,
            name: row.name,
            price: parseFloat(row.price),
            category: row.category,
            sku: row.sku,
            stock: row.stock ? parseInt(row.stock) : undefined,
            description: row.description
          });
          
          results.push(product);
        } catch (err) {
          console.error(`Error parsing row:`, row, err);
        }
      })
      .on('end', async () => {
        try {
          // Import validated products
          const importedProducts = await Promise.all(
            results.map(product => 
              storage.createProduct({
                ...product,
                currentPrice: product.price.toString(),
                userId
              })
            )
          );
          
          resolve({
            success: true,
            imported: importedProducts.length,
            total: results.length
          });
        } catch (err) {
          reject(err);
        }
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}
