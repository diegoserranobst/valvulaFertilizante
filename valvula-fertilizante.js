module.exports = function (RED) {
    function ValvulaFertilizante(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var debug = config.debug || false; // rescatar el campo debug


        // Variables de estado
        let ultimoMatrizLitros = 0;
        let ultimoFertilizanteLitros = 0;
        let matrizLitrosFluido = 0;
        let fertilizanteLitrosFluido = 0;
        let inyectarActivoAnterior = false;
        let inyectarActivo = false;
        let configActual = null;
        let fertilizanteLitrosBase = null;


        node.on("input", function (msg, send, done) {
            if (debug) console.log("---- INICIO DEL FLUJO ----");
            if (debug) console.log("Input recibido:", JSON.stringify(msg));
            if (debug) console.log(`Estado inicial de variables: matrizLitrosFluido=${matrizLitrosFluido}, configActual=${JSON.stringify(configActual)}`);
            let valvulaFertilizante = false;
            let estado = "Esperando inicialización";

            if (msg.payload.config) {
                configActual = msg.payload.config;
                if (debug) console.log("Configuración actualizada:", configActual);
            }


            if (msg.payload.inyectarActivo !== undefined) {
                inyectarActivoAnterior = inyectarActivo;
                inyectarActivo = msg.payload.inyectarActivo;
                if (debug) console.log("Cambio de inyectarActivo:", inyectarActivo);

                if (inyectarActivo && !inyectarActivoAnterior) {
                    if (debug) console.log("Activando inyección...");
                    // Reiniciar matrizLitrosFluido a 0 aquí o ajustar de acuerdo con ultimoMatrizLitros
                    matrizLitrosFluido = 0;
                    ultimoMatrizLitros = msg.payload.matrizLitros || 0; // Inicializar con el valor actual
                    ultimoFertilizanteLitros = msg.payload.fertilizanteLitros || 0;
                    if (debug) console.log("Variables reiniciadas.");
                }
            }

            if (msg.payload.matrizLitros !== undefined && configActual) {
                if (debug) console.log(`Actualizando matrizLitrosFluido.. inyectarActivo: ${inyectarActivo}, inyectarActivoAnterior: ${inyectarActivoAnterior}`);
                if (debug) console.log(`matrizLitrosFluido: ${msg.payload.matrizLitros}, ultimoMatrizLitros: ${ultimoMatrizLitros}`);
                if (inyectarActivo && !inyectarActivoAnterior) {
                    // No actualizar matrizLitrosFluido en este caso
                    inyectarActivoAnterior = inyectarActivo;
                } else {
                    matrizLitrosFluido += (msg.payload.matrizLitros - ultimoMatrizLitros);
                }
                ultimoMatrizLitros = msg.payload.matrizLitros; // Actualizar último valor
                if (debug) console.log(`matrizLitrosFluido actualizado a ${matrizLitrosFluido}, configActual.gatillar es ${configActual.gatillar}`);
            }





            if (inyectarActivo && configActual) {
                if (debug) console.log(`Evaluando: matrizLitrosFluido=${matrizLitrosFluido}, configActual.gatillar=${configActual.gatillar}`);
                if (matrizLitrosFluido >= configActual.gatillar) {
                    valvulaFertilizante = true;
                    if (debug) console.log("Condición para gatillar cumplida");
                    // Establecer el valor base la primera vez que valvulaFertilizante pasa a true
                    if (fertilizanteLitrosBase === null && msg.payload.fertilizanteLitros !== undefined) {
                        fertilizanteLitrosBase = msg.payload.fertilizanteLitros;
                    }
                }
            }

            if (msg.payload.fertilizanteLitros !== undefined && valvulaFertilizante && fertilizanteLitrosBase !== null) {
                if (debug) console.log("Actualizando fertilizanteLitrosFluido...");
                fertilizanteLitrosFluido += (msg.payload.fertilizanteLitros - fertilizanteLitrosBase);
                fertilizanteLitrosBase = msg.payload.fertilizanteLitros; // Actualizar valor base
                if (debug) console.log("fertilizanteLitrosFluido actualizado:", fertilizanteLitrosFluido);
            }

            if (inyectarActivo && configActual) {
                if (valvulaFertilizante) {
                    estado = `Inyectando. Faltan ${configActual.fertilizante - fertilizanteLitrosFluido} litros para completar.`;
                    if (fertilizanteLitrosFluido >= configActual.fertilizante) {
                        if (debug) console.log("Fertilizante completado. Reiniciando variables...");
                        valvulaFertilizante = false;
                        estado = `Esperando para gatillar. Faltan ${configActual.gatillar} litros.`;
                        matrizLitrosFluido = 0;
                        fertilizanteLitrosFluido = 0;
                        fertilizanteLitrosBase = null; // Reiniciar el valor base
                    }
                } else {
                    estado = `Esperando para gatillar. Faltan ${configActual.gatillar - matrizLitrosFluido} litros.`;
                }
            } else {
                valvulaFertilizante = false;
                if (!inyectarActivo) {
                    estado = "Inyección desactivada";
                }
            }

            if (debug) console.log("Estado final:", estado);
            if (debug) console.log("---- FIN DEL FLUJO ----");

            send({ payload: { valvulaFertilizante, estado } });
            if (done) {
                done();
            }
        });
    }

    RED.nodes.registerType("valvula-fertilizante", ValvulaFertilizante);
};
