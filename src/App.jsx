import { useState } from 'react';
import SecondaryStructure from './SecondaryStructures';
import './App.css';

function App() {
  const [selectedFamily] = useState({
    acc: 'RF00001',
    id: '5S_rRNA',
  });

  return (
    <div className="app">
      <div className="app-content">
        <SecondaryStructure
          familyAcc={selectedFamily.acc}
          imageTypes={['rscape', 'cons', 'fcbp', 'cov', 'ent', 'maxcm', 'norm', 'rchie']}
          apiBaseUrl="https://rfam.org/family"
          varnaEnabled={true}
          showLegend={true}
          showDescription={true}
        />
      </div>
    </div>
  );
}

export default App;
