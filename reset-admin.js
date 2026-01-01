const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al abrir la base de datos', err.message);
        process.exit(1);
    }
    console.log('Conectado a la base de datos SQLite');
    
    // Eliminar todos los usuarios existentes
    db.run('DELETE FROM usuarios', function(err) {
        if (err) {
            console.error('Error al eliminar usuarios existentes:', err.message);
        } else {
            console.log(`🗑️ Todos los usuarios eliminados: ${this.changes} filas afectadas`);
        }
        
        // Crear primer usuario admin
        const adminEmail1 = 'lighting2385@gmail.com';
        const adminPassword1 = 'Pitimirri2385';
        const hashedPassword1 = bcrypt.hashSync(adminPassword1, 10);
        
        db.run('INSERT INTO usuarios (email, password) VALUES (?, ?)', 
            [adminEmail1, hashedPassword1], 
            function(err) {
                if (err) {
                    console.error('Error al crear primer usuario:', err.message);
                } else {
                    console.log('✅ Primer usuario admin creado:');
                    console.log(`📧 Email: ${adminEmail1}`);
                    console.log('🔑 Contraseña: Pitimirri2385');
                }
                
                // Crear segundo usuario admin
                const adminEmail2 = 'gunnarcuchu@gmail.com';
                const adminPassword2 = 'SESAMO123';
                const hashedPassword2 = bcrypt.hashSync(adminPassword2, 10);
                
                db.run('INSERT INTO usuarios (email, password) VALUES (?, ?)', 
                    [adminEmail2, hashedPassword2], 
                    function(err) {
                        if (err) {
                            console.error('Error al crear segundo usuario:', err.message);
                        } else {
                            console.log('✅ Segundo usuario admin creado:');
                            console.log(`📧 Email: ${adminEmail2}`);
                            console.log('🔑 Contraseña: SESAMO123');
                        }
                        
                        console.log('\n🎉 Usuarios administradores configurados correctamente');
                        
                        db.close((err) => {
                            if (err) {
                                console.error('Error al cerrar la base de datos:', err.message);
                            } else {
                                console.log('Base de datos cerrada');
                            }
                            process.exit(0);
                        });
                    }
                );
            }
        );
    });
});
