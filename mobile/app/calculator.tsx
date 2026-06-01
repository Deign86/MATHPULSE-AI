import React, { useState } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

type Operator = '+' | '−' | '×' | '÷' | '^' | '√' | 'sin' | 'cos' | 'tan' | 'log' | 'ln' | '(' | ')' | 'π' | 'e' | 'C' | '⌫' | '=' | '.';

const KEYS: { label: string; op: Operator; type: 'number' | 'op' | 'function' | 'clear' | 'back' | 'equals' }[] = [
  { label: 'C', op: 'C', type: 'clear' },
  { label: '⌫', op: '⌫', type: 'back' },
  { label: '(', op: '(', type: 'op' },
  { label: ')', op: ')', type: 'op' },
  { label: 'sin', op: 'sin', type: 'function' },
  { label: 'cos', op: 'cos', type: 'function' },
  { label: 'tan', op: 'tan', type: 'function' },
  { label: '√', op: '√', type: 'function' },
  { label: '7', op: '7' as Operator, type: 'number' },
  { label: '8', op: '8' as Operator, type: 'number' },
  { label: '9', op: '9' as Operator, type: 'number' },
  { label: '÷', op: '÷', type: 'op' },
  { label: 'log', op: 'log', type: 'function' },
  { label: '4', op: '4' as Operator, type: 'number' },
  { label: '5', op: '5' as Operator, type: 'number' },
  { label: '6', op: '6' as Operator, type: 'number' },
  { label: '×', op: '×', type: 'op' },
  { label: 'ln', op: 'ln', type: 'function' },
  { label: '1', op: '1' as Operator, type: 'number' },
  { label: '2', op: '2' as Operator, type: 'number' },
  { label: '3', op: '3' as Operator, type: 'number' },
  { label: '−', op: '−', type: 'op' },
  { label: 'π', op: 'π', type: 'function' },
  { label: '0', op: '0' as Operator, type: 'number' },
  { label: '.', op: '.', type: 'number' },
  { label: 'xⁿ', op: '^', type: 'op' },
  { label: '+', op: '+', type: 'op' },
  { label: 'e', op: 'e', type: 'function' },
];

function safeEval(expr: string): number {
  // Very small safe evaluator for basic + − × ÷ ^ and funcs
  // NOT production-grade — just a math helper for the calculator screen
  const sanitized = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'Math.PI')
    .replace(/√/g, 'Math.sqrt')
    .replace(/\^/g, '**')
    .replace(/sin\(/g, 'Math.sin(')
    .replace(/cos\(/g, 'Math.cos(')
    .replace(/tan\(/g, 'Math.tan(')
    .replace(/log\(/g, 'Math.log10(')
    .replace(/ln\(/g, 'Math.log(');
  // eslint-disable-next-line no-new-func
  const result = Function(`"use strict"; return (${sanitized})`)();
  return result;
}

export default function CalculatorScreen() {
  const [expr, setExpr] = useState('0');
  const [history, setHistory] = useState<{ expr: string; result: string }[]>([]);

  const press = (label: string, type: string) => {
    if (type === 'clear') {
      setExpr('0');
      return;
    }
    if (type === 'back') {
      setExpr((e) => (e.length <= 1 ? '0' : e.slice(0, -1)));
      return;
    }
    if (type === 'equals') {
      try {
        const result = safeEval(expr);
        const resultStr = Number.isInteger(result) ? result.toString() : result.toFixed(8).replace(/\.?0+$/, '');
        setHistory((h) => [{ expr, result: resultStr }, ...h].slice(0, 10));
        setExpr(resultStr);
      } catch {
        Alert.alert('Error', 'Invalid expression');
      }
      return;
    }
    setExpr((e) => (e === '0' && type === 'number' ? label : e + label));
  };

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 pt-8 pb-2">
        <Text variant="h1" className="text-foreground">Calculator</Text>
      </View>

      {/* Display */}
      <View className="px-4 pt-2 pb-4">
        <Card className="p-4 bg-surface">
          <Text className="text-muted-foreground text-xs text-right">{expr}</Text>
          <Text className="text-foreground text-3xl font-bold text-right mt-1" numberOfLines={1}>
            {(() => {
              try {
                return safeEval(expr).toString();
              } catch {
                return '—';
              }
            })()}
          </Text>
        </Card>
      </View>

      {/* Keypad */}
      <View className="px-4 flex-1">
        <View className="flex-row flex-wrap gap-2">
          {KEYS.map((k) => {
            const color =
              k.type === 'equals'
                ? 'bg-primary border-primary'
                : k.type === 'clear'
                  ? 'bg-red-500/15 border-red-500/30'
                  : k.type === 'back'
                    ? 'bg-amber-500/15 border-amber-500/30'
                    : k.type === 'op'
                      ? 'bg-violet-500/15 border-violet-500/30'
                      : k.type === 'function'
                        ? 'bg-blue-500/15 border-blue-500/30'
                        : 'bg-surface border-border';
            return (
              <TouchableOpacity
                key={k.label}
                onPress={() => press(k.label, k.type)}
                className={`flex-1 min-w-[22%] h-14 rounded-xl border items-center justify-center ${color}`}
              >
                <Text className="text-foreground text-lg font-semibold">{k.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* History */}
      {history.length > 0 && (
        <View className="px-4 py-3 border-t border-border">
          <Text className="text-muted-foreground text-xs mb-2">History</Text>
          <ScrollView className="max-h-24">
            {history.map((h, i) => (
              <View key={i} className="flex-row justify-between py-0.5">
                <Text className="text-muted-foreground text-xs">{h.expr}</Text>
                <Text className="text-foreground text-xs font-semibold">= {h.result}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View className="px-4 py-2">
        <Text className="text-muted-foreground text-[10px] text-center">
          Built-in scientific calculator. Supports sin, cos, tan, log, ln, √, π, e, ^, and basic arithmetic.
        </Text>
      </View>
    </View>
  );
}
