const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(
  /<link href=""https:\/\/fonts\.googleapis\.com\/css2\?family=Nunito:wght@300;400;500;600;700;800;900&display=swap"" rel=""stylesheet"" \/>/g,
  '<link href=""https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap"" rel=""stylesheet"" />'
);
html = html.replace(/font-family:'Nunito'/g, "font-family:'DM Sans');

fs.writeFileSync('index.html', html);

let sidebar = fs.readFileSync('./src/components/Sidebar.tsx', 'utf8');

const regexSidebarBase = /<aside className=""w-64 bg-card border-r border-border flex flex-col flex-shrink-0 transition-all duration-300""[^>]*>/m;
sidebar = sidebar.replace(regexSidebarBase, '<aside className=""w-[210px] bg-white border-r border-[#e2e8f0] flex flex-col flex-shrink-0 transition-all duration-300 z-10 relative"">');

const oldListItemRegex = /className=\{\lex items-center py-3 px-4 mx-3 my-1 rounded-xl cursor-pointer transition-colors duration-200 \$\{[\s\S]*?\}\\}/g;
sidebar = sidebar.replace(oldListItemRegex, 'className={lex items-center p-[8px_12px] mx-[16px] my-[4px] rounded-[9px] cursor-pointer text-[12.5px] font-medium transition-colors }');

sidebar = sidebar.replace(/<Icon size=\{22\}/g, '<Icon size={18}');

fs.writeFileSync('./src/components/Sidebar.tsx', sidebar);
console.log('Sidebar & index.html updated.');
