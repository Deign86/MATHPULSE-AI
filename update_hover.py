import re

with open('src/components/FloatingAITutor.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_button = """        {/* Floating Button */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="pointer-events-auto w-16 h-16 bg-gradient-to-br from-sky-600 to-sky-500 rounded-2xl shadow-2xl flex items-center justify-center text-white hover:shadow-sky-300/50 transition-all self-end"
        >
          {isOpen ? <X size={28} /> : <img src="/avatar/avatar_icon.png" alt="AI Tutor" className="w-14 h-14 object-contain drop-shadow-lg" />}
        </motion.button>"""

new_button = """        {/* Floating Button with Tooltip Wrapper */}
        <div className="relative flex items-center group pointer-events-auto self-end">
          {/* Desktop/Tablet Hover Tooltip */}
          {!isOpen && (
            <div className="absolute right-[calc(100%+16px)] top-1/2 -translate-y-1/2 bg-white text-[#0a1628] text-[13px] font-bold px-4 py-2.5 rounded-[1.2rem] rounded-br-[4px] shadow-xl border border-sky-100 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap translate-x-2 group-hover:translate-x-0 hidden sm:block">
              Hello! I'm Loli, how may I help you?
              {/* Tooltip Triangle pointing right */}
              <div className="absolute top-full right-0 -mr-[5px] -mt-[15px] w-3 h-3 bg-white border-t border-r border-sky-100 transform rotate-45 rounded-sm"></div>
            </div>
          )}

          <motion.button
            onClick={() => setIsOpen(!isOpen)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-16 h-16 bg-gradient-to-br from-sky-600 to-sky-500 rounded-2xl shadow-2xl flex items-center justify-center text-white hover:shadow-sky-300/50 transition-shadow relative z-10"
          >
            {isOpen ? <X size={28} /> : <img src="/avatar/avatar_icon.png" alt="AI Tutor" className="w-14 h-14 object-contain drop-shadow-lg" />}
          </motion.button>
        </div>"""

text = text.replace(old_button, new_button)

with open('src/components/FloatingAITutor.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Added hover tooltip successfully.")
