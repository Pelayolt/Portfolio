import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Code,
  Wifi,
  Database,
  Github,
  Linkedin,
  Mail,
  MapPin,
  ExternalLink,
  Menu,
  X,
  Terminal,
  Server,
  Layers,
  MessageSquare,
  Send,
  Sparkles,
  Loader
} from 'lucide-react';

// --- Servicio de IA (Gemini) ---
const GeminiService = {
  async generateContent(prompt) {


    if (!apiKey) {
      try {
        apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      } catch (e) {
        console.error("No se pudo cargar la API Key desde las variables de entorno.", e);}
    }

    if (!apiKey) {
      return "⚠️ Error: Falta la API Key. Por favor, abre el archivo App.jsx y pega tu clave de Google en la constante PUBLIC_DEMO_API_KEY al inicio del archivo.";
    }

    // Usamos el modelo público gratuito 'gemini-1.5-flash'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });

      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'La IA no devolvió respuesta.';
    } catch (error) {
      console.error("Error Gemini:", error);
      return `Error técnico: ${error.message}`;
    }
  },

  async summarizeProject(title, description) {
    const prompt = `Actúa como un CTO evaluando candidatos. Resume este proyecto técnico en 1 frase potente (máx 25 palabras) destacando el stack tecnológico: Título: ${title}. Descripción: ${description}`;
    return this.generateContent(prompt);
  },

  async chatWithAssistant(userMessage, chatHistory) {
    const context = `Eres "PelayoAI", el asistente virtual del ingeniero Pelayo López Tomé.
    Objetivo: Convencer a reclutadores de que Pelayo es el candidato ideal para puestos de IoT o Full Stack.
    Perfil: Graduado en Ingeniería Informática (UDC), Máster IoT. Experto en ESP32, MQTT, React, Docker, Linux.
    Estilo: Breve, profesional y directo al grano.
    Si te preguntan algo que no sea sobre Pelayo, di amablemente que solo hablas de él.`;
    
    // Historial reducido para ahorrar tokens
    const history = chatHistory.slice(-4).map(m => `${m.sender}: ${m.text}`).join('\n');
    return this.generateContent(`${context}\n\nHistorial:\n${history}\n\nUsuario: ${userMessage}\nPelayoAI:`);
  },

  async suggestEmailSubject(messageBody) {
    const prompt = `Lee este mensaje de contacto y dame 3 asuntos de email profesionales y cortos (separados por coma): "${messageBody}"`;
    const resp = await this.generateContent(prompt);
    if (resp.includes("⚠️") || resp.includes("Error")) return [resp];
    return resp.split(/,|\n/).map(s => s.trim()).filter(s => s.length > 0).slice(0, 3);
  }
};

// --- Componente Principal ---
const Portfolio = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [scrolled, setScrolled] = useState(false);

  // Estados IA
  const [projectSummaries, setProjectSummaries] = useState({});
  const [loadingSummaries, setLoadingSummaries] = useState({});
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: '👋 Hola. Soy el asistente virtual de Pelayo. ¿Quieres saber más sobre su experiencia en IoT?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Estados Formulario
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [suggestedSubjects, setSuggestedSubjects] = useState([]);
  const [isSuggestingSubject, setIsSuggestingSubject] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Scroll Spy
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      ['home', 'about', 'skills', 'projects', 'contact'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top >= 0 && el.getBoundingClientRect().top <= 300) setActiveSection(id);
      });
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Chat Scroll
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, isChatOpen]);

  // Handlers IA
  const handleSummarize = async (idx, title, desc) => {
    setLoadingSummaries(p => ({ ...p, [idx]: true }));
    const text = await GeminiService.summarizeProject(title, desc);
    setProjectSummaries(p => ({ ...p, [idx]: text }));
    setLoadingSummaries(p => ({ ...p, [idx]: false }));
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userText = chatInput;
    setChatMessages(p => [...p, { sender: 'user', text: userText }]);
    setChatInput('');
    setIsChatLoading(true);
    const aiText = await GeminiService.chatWithAssistant(userText, chatMessages);
    setChatMessages(p => [...p, { sender: 'ai', text: aiText }]);
    setIsChatLoading(false);
  };

  const handleSuggestSubject = async () => {
    if (!contactMessage) return;
    setIsSuggestingSubject(true);
    const subs = await GeminiService.suggestEmailSubject(contactMessage);
    setSuggestedSubjects(subs);
    setIsSuggestingSubject(false);
  };

  // Handler Contacto (Notificación Móvil)
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setIsSending(true);
    try {
      // Usamos ntfy.sh (puedes cambiar 'pelayo_iot_portfolio_contact' por otro nombre único si quieres privacidad)
      await fetch('https://ntfy.sh/pelayo_iot_portfolio_contact', {
        method: 'POST',
        body: `De: ${contactName} (${contactEmail})\n\n${contactMessage}`,
        headers: { 'Tags': 'rocket', 'Title': 'Nuevo Lead desde Web' }
      });
      setIsSending(false);
      setSendSuccess(true);
      setContactName(''); setContactEmail(''); setContactMessage(''); setSuggestedSubjects([]);
      setTimeout(() => setSendSuccess(false), 5000);
    } catch (err) {
      console.error(err);
      setIsSending(false);
      alert("Error al enviar. Por favor contáctame por LinkedIn.");
    }
  };

  // Datos del Portafolio
  const navLinks = [
    { name: 'Inicio', href: '#home' },
    { name: 'Sobre mí', href: '#about' },
    { name: 'Habilidades', href: '#skills' },
    { name: 'Proyectos', href: '#projects' },
    { name: 'Contacto', href: '#contact' },
  ];

  const skills = [
    { category: "Hardware & IoT", icon: <Cpu className="text-cyan-400" />, items: ["ESP32 / Arduino", "Raspberry Pi", "MQTT / CoAP", "Diseño PCBs (KiCad)", "LoRaWAN", "Sensores I2C/SPI"] },
    { category: "Software Dev", icon: <Code className="text-purple-400" />, items: ["C++ / C Embedded", "Python", "React.js", "Node.js", "Git / GitHub", "Verilog"] },
    { category: "Infraestructura", icon: <Database className="text-emerald-400" />, items: ["Docker & Containers", "AWS IoT Core", "Linux (Debian/Arch)", "Grafana / InfluxDB"] }
  ];

  const projects = [
    { title: "Monitorización Ambiental Distribuida", type: "IoT", desc: "Red de nodos ESP32 autónomos que reportan métricas de calidad de aire y temperatura vía MQTT a un servidor centralizado con visualización en Grafana.", tags: ["ESP32", "MQTT", "C++", "Grafana"] },
    { title: "Smart Parking con Visión Artificial", type: "Computer Vision", desc: "Sistema de detección de plazas libres en tiempo real utilizando cámaras, OpenCV en Raspberry Pi y una interfaz web React para el usuario final.", tags: ["Python", "OpenCV", "React", "RPi"] },
    { title: "Hub Domótico Seguro (Offline First)", type: "Security", desc: "Controlador domótico Zigbee desplegado en contenedores Docker, diseñado para funcionar sin internet priorizando la privacidad de los datos del usuario.", tags: ["Docker", "Zigbee", "Linux", "Home Assistant"] }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-cyan-500/30">
      
      {/* Navbar */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-slate-900/95 backdrop-blur shadow-lg border-b border-slate-800' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 group cursor-pointer" onClick={() => window.scrollTo(0,0)}>
            <div className="p-1.5 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition-colors border border-slate-700">
              <Terminal className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="font-bold text-xl text-white tracking-tight">PELAYO<span className="text-cyan-400">.DEV</span></span>
          </div>
          
          <div className="hidden md:flex space-x-8">
            {navLinks.map(l => (
              <a key={l.name} href={l.href} className={`text-sm font-medium transition-colors hover:text-cyan-400 ${activeSection === l.href.substring(1) ? 'text-cyan-400' : 'text-slate-400'}`}>
                {l.name}
              </a>
            ))}
          </div>

          <button className="md:hidden text-slate-300 hover:text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
        
        {isMenuOpen && (
          <div className="md:hidden bg-slate-800 border-b border-slate-700 px-4 py-4 space-y-2 shadow-xl">
            {navLinks.map(l => (
              <a key={l.name} href={l.href} onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-700/50 rounded-lg font-medium">
                {l.name}
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-20 relative overflow-hidden min-h-screen flex items-center">
        {/* Fondos decorativos */}
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] -mr-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] -ml-20"></div>

        <div className="max-w-7xl mx-auto px-4 relative z-10 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-bold mb-6 tracking-wide">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-ping mr-2 opacity-75"></span>
              DISPONIBLE PARA PROYECTOS
            </div>
            <h1 className="text-5xl sm:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
              Ingeniero <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">IoT & Software</span>
            </h1>
            <p className="text-xl text-slate-400 mb-8 max-w-lg leading-relaxed">
              Hola, soy <strong>Pelayo López</strong>. Especialista en conectar el mundo físico con el digital. Graduado en la UDC, construyo soluciones embebidas y arquitecturas en la nube escalables.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#projects" className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition-all transform hover:-translate-y-1 flex items-center justify-center">
                Ver Proyectos <Wifi className="ml-2 w-5 h-5" />
              </a>
              <a href="#contact" className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-all flex items-center justify-center hover:border-slate-500">
                Contactar
              </a>
            </div>
            <div className="mt-10 flex items-center gap-6 text-slate-500">
               <a href="#" className="hover:text-white transition-colors"><Github className="w-6 h-6"/></a>
               <a href="#" className="hover:text-blue-400 transition-colors"><Linkedin className="w-6 h-6"/></a>
               <div className="h-6 w-px bg-slate-700"></div>
               <span className="flex items-center text-sm"><MapPin className="w-4 h-4 mr-2"/> A Coruña, España</span>
            </div>
          </div>
          
          {/* Ilustración Abstracta IoT */}
          <div className="hidden lg:flex justify-center relative select-none pointer-events-none">
            <div className="relative w-96 h-96">
              <div className="absolute inset-0 border border-slate-700/50 rounded-full animate-[spin_20s_linear_infinite]"></div>
              <div className="absolute inset-8 border border-slate-700/30 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-slate-800/80 backdrop-blur-sm p-8 rounded-3xl border border-slate-600 shadow-2xl relative z-10">
                  <Server className="w-20 h-20 text-cyan-400" />
                </div>
              </div>
              {/* Elementos flotantes */}
              <div className="absolute top-0 left-1/2 -ml-4 bg-slate-900 p-3 rounded-xl border border-slate-700 shadow-lg animate-bounce delay-100">
                <Wifi className="text-emerald-400 w-6 h-6" />
              </div>
              <div className="absolute bottom-10 right-0 bg-slate-900 p-3 rounded-xl border border-slate-700 shadow-lg animate-pulse">
                <Database className="text-purple-400 w-6 h-6" />
              </div>
              <div className="absolute top-1/2 left-0 -ml-4 bg-slate-900 p-3 rounded-xl border border-slate-700 shadow-lg">
                <Layers className="text-orange-400 w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Skills */}
      <section id="skills" className="py-24 bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
             <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Stack Tecnológico</h2>
             <div className="h-1 w-20 bg-cyan-500 mx-auto rounded-full"></div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {skills.map((s, i) => (
              <div key={i} className="group bg-slate-800/50 p-8 rounded-2xl border border-slate-700 hover:border-cyan-500/40 hover:bg-slate-800 transition-all hover:-translate-y-1 duration-300">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 mr-4 group-hover:scale-110 transition-transform duration-300">
                    {s.icon}
                  </div>
                  <h3 className="font-bold text-xl text-white">{s.category}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.items.map(tech => (
                    <span key={tech} className="px-3 py-1.5 bg-slate-900 text-sm font-medium text-slate-300 rounded-lg border border-slate-700/50 group-hover:border-cyan-500/20 transition-colors">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects */}
      <section id="projects" className="py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
             <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Proyectos Destacados</h2>
             <p className="text-slate-400">Una selección de mis trabajos en IoT, Visión Artificial y Sistemas Seguros.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((p, i) => (
              <div key={i} className="flex flex-col bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 hover:border-cyan-500/30 transition-all hover:shadow-2xl hover:shadow-cyan-900/10 group">
                {/* Header Visual */}
                <div className="h-48 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-transparent transition-colors"></div>
                  {p.type.includes('IoT') && <Wifi className="w-16 h-16 text-cyan-400/30 group-hover:text-cyan-400 group-hover:scale-110 transition-all duration-500" />}
                  {p.type.includes('Vision') && <Layers className="w-16 h-16 text-purple-400/30 group-hover:text-purple-400 group-hover:scale-110 transition-all duration-500" />}
                  {p.type.includes('Security') && <Server className="w-16 h-16 text-emerald-400/30 group-hover:text-emerald-400 group-hover:scale-110 transition-all duration-500" />}
                </div>

                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase bg-cyan-900/20 px-2 py-1 rounded">{p.type}</span>
                    <div className="flex gap-2 text-slate-500">
                      <Github className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
                      <ExternalLink className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
                    </div>
                  </div>

                  <h3 className="font-bold text-white text-xl mb-3 group-hover:text-cyan-400 transition-colors">{p.title}</h3>
                  
                  <div className="flex-grow mb-6 text-sm text-slate-400 leading-relaxed">
                    {projectSummaries[i] ? (
                      <div className="p-4 bg-cyan-950/30 border border-cyan-500/20 rounded-lg text-cyan-200 animate-fadeIn">
                        <Sparkles className="w-4 h-4 inline mr-2 text-cyan-400" />
                        <span className="italic">"{projectSummaries[i]}"</span>
                      </div>
                    ) : (
                      <p>{p.desc}</p>
                    )}
                  </div>
                  
                  {!projectSummaries[i] && (
                    <button 
                      onClick={() => handleSummarize(i, p.title, p.desc)}
                      disabled={loadingSummaries[i]}
                      className="w-full py-2 mb-6 rounded-lg border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-700/50 text-xs font-medium text-cyan-400 transition-all flex items-center justify-center gap-2 group/btn"
                    >
                      {loadingSummaries[i] ? <Loader className="animate-spin w-3 h-3" /> : <Sparkles className="w-3 h-3 group-hover/btn:scale-125 transition-transform" />}
                      Generar resumen con IA
                    </button>
                  )}

                  <div className="flex flex-wrap gap-2 mt-auto border-t border-slate-700/50 pt-4">
                    {p.tags.map(t => (
                      <span key={t} className="text-xs font-mono font-medium text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-700/50">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-24 bg-slate-800/30 relative">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 md:p-12 rounded-3xl border border-slate-700 shadow-2xl relative overflow-hidden">
            {/* Decoración fondo */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

            <div className="grid md:grid-cols-5 gap-12 relative z-10">
              {/* Info lateral */}
              <div className="md:col-span-2 space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-4">Hablemos</h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Estoy buscando nuevas oportunidades y retos en el mundo IoT. Si tienes un proyecto en mente, ¡escríbeme!
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center p-4 bg-slate-900/80 rounded-xl border border-slate-700/50">
                    <div className="bg-cyan-900/20 p-2.5 rounded-lg mr-4"><Mail className="w-5 h-5 text-cyan-400"/></div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Email</p>
                      <p className="text-white font-medium">pelayolt@gmail.com</p>
                    </div>
                  </div>
                  <div className="flex items-center p-4 bg-slate-900/80 rounded-xl border border-slate-700/50">
                    <div className="bg-purple-900/20 p-2.5 rounded-lg mr-4"><Linkedin className="w-5 h-5 text-purple-400"/></div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Social</p>
                      <p className="text-white font-medium">/in/pelayo-lopez</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Formulario */}
              <div className="md:col-span-3">
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nombre</label>
                      <input required type="text" value={contactName} onChange={e => setContactName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all" placeholder="Tu nombre" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
                      <input required type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all" placeholder="tucorreo@ejemplo.com" />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Mensaje</label>
                    <textarea required rows="5" value={contactMessage} onChange={e => setContactMessage(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all resize-none" placeholder="Cuéntame sobre tu proyecto..."></textarea>
                  </div>
                  
                  {/* Sugerencias IA */}
                  <div className="min-h-[30px]">
                    {contactMessage.length > 15 && suggestedSubjects.length === 0 && (
                      <button type="button" onClick={handleSuggestSubject} disabled={isSuggestingSubject} className="text-xs text-cyan-400 hover:text-white transition-colors flex items-center gap-1.5 ml-1">
                        {isSuggestingSubject ? <Loader className="animate-spin w-3 h-3"/> : <Sparkles className="w-3 h-3"/>}
                        ¿Necesitas ayuda con el asunto? Pregúntale a la IA
                      </button>
                    )}
                    {suggestedSubjects.length > 0 && (
                      <div className="flex flex-wrap gap-2 animate-fadeIn">
                        {suggestedSubjects.map(sub => (
                          <button key={sub} type="button" onClick={() => { setContactMessage(`Asunto: ${sub}\n\n${contactMessage}`); setSuggestedSubjects([]); }} className="text-xs bg-cyan-900/30 text-cyan-300 px-3 py-1.5 rounded-full border border-cyan-500/20 hover:bg-cyan-900/60 hover:border-cyan-500/50 transition-all">
                            {sub}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button 
                    disabled={isSending || sendSuccess} 
                    className={`w-full py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 transition-all transform active:scale-95 shadow-lg ${
                      sendSuccess 
                        ? 'bg-green-600 text-white shadow-green-900/20' 
                        : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-900/20'
                    } disabled:opacity-70 disabled:cursor-not-allowed`}
                  >
                    {isSending ? <Loader className="animate-spin w-5 h-5"/> : sendSuccess ? "¡Mensaje Enviado!" : <><Send className="w-5 h-5" /> Enviar Mensaje</>}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-900 border-t border-slate-800 text-center">
        <p className="text-slate-500 text-sm mb-2">
          © {new Date().getFullYear()} Pelayo López Tomé. Construido con React, Tailwind & Google Gemini.
        </p>
        <p className="text-xs text-slate-600 flex justify-center items-center gap-1">
          <MapPin className="w-3 h-3" /> A Coruña, Galicia
        </p>
      </footer>

      {/* Chatbot Flotante */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isChatOpen ? (
          <button 
            onClick={() => setIsChatOpen(true)} 
            className="group bg-cyan-600 p-4 rounded-full shadow-lg shadow-cyan-500/30 text-white hover:scale-110 transition-transform hover:bg-cyan-500"
          >
            <MessageSquare className="w-6 h-6 group-hover:animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </button>
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-80 sm:w-96 h-[500px] flex flex-col overflow-hidden animate-slideUp origin-bottom-right">
            {/* Chat Header */}
            <div className="bg-slate-900 p-4 flex justify-between items-center border-b border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-cyan-900/50 flex items-center justify-center border border-cyan-500/30">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">PelayoAI</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> En línea
                  </p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-800/50 scrollbar-thin scrollbar-thumb-slate-700">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    m.sender === 'user' 
                      ? 'bg-cyan-600 text-white rounded-br-none' 
                      : 'bg-slate-700 text-slate-200 rounded-bl-none border border-slate-600'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-700 text-slate-200 p-3 rounded-2xl rounded-bl-none text-sm flex items-center gap-2 border border-slate-600">
                    <Loader className="w-3 h-3 animate-spin text-cyan-400" />
                    <span className="opacity-75">Escribiendo...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef}></div>
            </div>
            
            {/* Chat Input */}
            <form onSubmit={handleChatSubmit} className="p-3 bg-slate-900 border-t border-slate-700 flex gap-2">
              <input 
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)} 
                placeholder="Pregunta sobre mi experiencia..." 
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all placeholder-slate-500" 
              />
              <button disabled={!chatInput || isChatLoading} className="p-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <Send className="w-5 h-5"/>
              </button>
            </form>
          </div>
        )}
      </div>

    </div>
  );
};

export default Portfolio;