import SwiftUI

struct LiquidGlassToggle: View {
    @State private var isOn = false
    var body: some View {
        Toggle(isOn: $isOn) {
            Text("Enable Feature")
                .foregroundColor(.black)
                .font(.headline)
        }
        .toggleStyle(SwitchToggleStyle(tint: .black))
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(18)
        .shadow(color: .black.opacity(0.14), radius: 8, x: 0, y: 4)
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Color.white.opacity(0.21), lineWidth: 1)
        )
    }
}