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
          familyId={selectedFamily.id}
          imageTypes={['rscape', 'seqcons', 'norm', 'cov','ent','maxcm','bpcons','rchie']}
          apiBaseUrl="http://localhost:3000/family"
          varnaEnabled={true}
          showImageInfo={true}
        />
      </div>
    </div>
  );
}

export default App;
