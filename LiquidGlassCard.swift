import SwiftUI

struct LiquidGlassCard: View {
    var body: some View {
        ZStack {
            // White base, no gradients
            Color.white.ignoresSafeArea()
            
            VStack(spacing: 16) {
                Text("Liquid Glass Card")
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundColor(.black)
                Text("iOS 26 glass effect, pure and elegant")
                    .font(.subheadline)
                    .foregroundColor(.black.opacity(0.7))
            }
            .padding()
            .frame(maxWidth: .infinity)
            .background(.ultraThinMaterial)
            .cornerRadius(30)
            .shadow(color: .black.opacity(0.16), radius: 18, x: 0, y: 8)
            .overlay(
                RoundedRectangle(cornerRadius: 30, style: .continuous)
                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
            )
        }
    }
}