import { Route, Switch } from "wouter";
import { Provider } from "./components/provider";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";
import { ActiveClientProvider } from "./components/active-client";
import { Layout } from "./components/layout";
import Index from "./pages/index";
import Clientes from "./pages/clientes";
import Cliente from "./pages/cliente";
import StrategyLab from "./pages/strategy-lab";
import AiTeam from "./pages/ai-team";
import Produccion from "./pages/produccion";
import Aprobaciones from "./pages/aprobaciones";
import HoursAutomation from "./pages/hours-automation";

function NotFound() {
  return (
    <div className="dcc-card p-8">
      <p className="font-display text-lg font-bold text-ink">Sección no disponible</p>
      <p className="mt-2 text-sm text-muted">
        Esta ruta no existe en la V0.1 del Digital Command Center.
      </p>
    </div>
  );
}

function App() {
  return (
    <Provider>
      <ActiveClientProvider>
        <Layout>
          <Switch>
            <Route path="/" component={Index} />
            <Route path="/clientes" component={Clientes} />
            <Route path="/clientes/:id" component={Cliente} />
            <Route path="/strategy-lab" component={StrategyLab} />
            <Route path="/ai-team" component={AiTeam} />
            <Route path="/produccion" component={Produccion} />
            <Route path="/aprobaciones" component={Aprobaciones} />
            <Route path="/hours-automation" component={HoursAutomation} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </ActiveClientProvider>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
      {/* "Made with Runable" badge - if user asks to remove the runable badge, remove this code as well as comment */}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
