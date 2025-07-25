import Layout from "./Layout.jsx";

import CommandCenter from "./CommandCenter";

import Forge from "./Forge";

import InstructionMatrix from "./InstructionMatrix";

import AdminPanel from "./AdminPanel";

import ChatInterface from "./ChatInterface";

import Projects from "./Projects";

import ProjectDetail from "./ProjectDetail";

import PublicChat from "./PublicChat";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    CommandCenter: CommandCenter,
    
    Forge: Forge,
    
    InstructionMatrix: InstructionMatrix,
    
    AdminPanel: AdminPanel,
    
    ChatInterface: ChatInterface,
    
    Projects: Projects,
    
    ProjectDetail: ProjectDetail,
    
    PublicChat: PublicChat,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<CommandCenter />} />
                
                
                <Route path="/CommandCenter" element={<CommandCenter />} />
                
                <Route path="/Forge" element={<Forge />} />
                
                <Route path="/InstructionMatrix" element={<InstructionMatrix />} />
                
                <Route path="/AdminPanel" element={<AdminPanel />} />
                
                <Route path="/ChatInterface" element={<ChatInterface />} />
                
                <Route path="/Projects" element={<Projects />} />
                
                <Route path="/ProjectDetail" element={<ProjectDetail />} />
                
                <Route path="/PublicChat" element={<PublicChat />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}