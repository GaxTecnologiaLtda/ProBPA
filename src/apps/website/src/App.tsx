import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/home/HomePage';
import ConnectorPage from './pages/conector/ConnectorPage';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/conector" element={<ConnectorPage />} />
                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
