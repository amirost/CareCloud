const mongoose = require('mongoose');

// Sous-schéma pour les chemins de la solution optimale du mode RV
const optimalPathSchema = new mongoose.Schema({
  color: { type: String, required: true },
  path: { type: [String], required: true }
}, { _id: false });

// NOUVEAU: Sous-schéma pour les serveurs (utilisé par le Cloud et le Téléphone)
const serverSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    capacity: { type: Number, required: true },
    consumption: { type: Number, default: 0 }
    // D'autres propriétés de serveur peuvent être ajoutées ici si besoin
}, { _id: false });

// NOUVEAU: Sous-schéma pour les tâches (utilisé par le Point d'Exclamation)
const taskSchema = new mongoose.Schema({
    id: { type: String, required: true },
    charge: { type: Number, required: true },
    // D'autres propriétés de tâche peuvent être ajoutées ici
}, { _id: false });


// Schéma pour les nœuds, mis à jour pour le mode Cloud
const nodeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    // On ajoute les nouveaux types de nœuds
    enum: ['router', 'user', 'antenna', 'cloud', 'phone-config', 'task-creator'] 
  },
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  },
  // --- Propriétés spécifiques ---
  radius: { type: Number, default: null }, // Pour les antennes
  haloId: { type: String, default: null }, // Pour les antennes
  consumption: { type: Number, default: 0 }, // Pour les antennes
  consumptionBase: { type: Number, default: 0 }, // Pour les antennes
  consumptionRadiusEnabled: { type: Boolean, default: false }, // Pour les antennes

  // NOUVEAU: Pour différencier les utilisateurs (pairing vs cloud)
  userType: { 
    type: String, 
    enum: ['pairing', 'cloud'], 
    default: 'pairing' 
  },
  
  // NOUVEAU: Pour lier les sous-nœuds à leur utilisateur parent
  parentId: { 
    type: String, 
    default: null 
  },

  // NOUVEAU: Pour stocker les serveurs des nœuds Cloud et Téléphone
  servers: {
    type: [serverSchema],
    default: undefined // On ne sauvegarde le champ que s'il y a des serveurs
  },

  // NOUVEAU: Pour stocker les tâches du nœud Point d'Exclamation
  tasks: {
    type: [taskSchema],
    default: undefined // On ne sauvegarde le champ que s'il y a des tâches
  }
});

// Schéma pour les arêtes (inchangé)
const edgeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  capacity: { type: Number, required: true, default: 1 },
  distance: { type: Number, required: true, default: 1 },
  baseConsumption: { type: Number, required: true, default: 100 },
  consumption: { type: Number, default: 100 },
  thickness: { type: Number, default: 10 }
}, { _id: false });

// Schéma principal du graphe (inchangé, il est déjà flexible)
const graphSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  mode: { type: String, required: true, enum: ['RV', 'SC', 'Cloud'] },
  nodes: [nodeSchema],
  edges: [edgeSchema],
  minimumConsumption: { type: Number, default: null },
  optimalAntennaSet: { type: [String], default: [] },
  optimalPathSolution: { type: [optimalPathSchema], default: [] },
  antennaSettings: {
    consumptionEnabled: { type: Boolean, default: false },
    consumptionRadiusEnabled: { type: Boolean, default: false },
    consumptionBase: { type: Number, default: 0 }
  },
  metrics: {
    totalCapacity: { type: Number, default: 0 },
    totalConsumption: { type: Number, default: 0 }
  },
  courseContent:{
    title:{ type : String, default : '' },
    content:{ type:String, default:'' },
    images: [{ path: String, caption: String }]
  }
}, { timestamps: true });

// Middleware (hook) pour calculer les métriques avant sauvegarde (inchangé)
const calculateMetrics = function(doc) {
  let totalCapacity = 0;
  let totalConsumption = 0;
  
  if (doc.edges) {
    doc.edges.forEach(edge => {
      totalCapacity += edge.capacity || 0;
      totalConsumption += edge.consumption || 0;
    });
  }
  
  if (doc.antennaSettings && doc.antennaSettings.consumptionEnabled) {
    if (doc.nodes) {
      doc.nodes.forEach(node => {
        if (node.type === 'antenna') {
          totalConsumption += node.consumption || 0;
        }
      });
    }
  }
  
  if (!doc.metrics) doc.metrics = {};
  doc.metrics.totalCapacity = totalCapacity;
  doc.metrics.totalConsumption = totalConsumption;
};

graphSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  calculateMetrics(this);
  if (this.courseContent) {
    if (this.courseContent.title === undefined) this.courseContent.title = '';
    if (this.courseContent.content === undefined) this.courseContent.content = '';
    if (!Array.isArray(this.courseContent.images)) this.courseContent.images = [];
  }
  next();
});

graphSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  update.updatedAt = Date.now();
  // On s'assure de recalculer les métriques si les noeuds ou arêtes ont changé
  if (update.nodes || update.edges || update.antennaSettings) {
    // Il faut charger le document complet pour recalculer, car `update` peut être partiel
    // Pour la simplicité, on le recalcule ici, mais une approche plus robuste chargerait le doc.
    calculateMetrics(update);
  }
  next();
});

const Graph = mongoose.model('Graph', graphSchema);

module.exports = Graph;