import SwiftUI

struct ContentView: View {
    var body: some View {
        NavigationView {
            ZStack {
                LinearGradient(
                    colors: [Color.blue.opacity(0.45), Color.purple.opacity(0.25)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                VStack(spacing: 40) {
                    GlassyCardView()
                    Spacer()
                }
                .padding(.top, 80)
            }
            .navigationTitle("iOS 26 Glass Demo")
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Liquid Glass")
                        .font(.headline)
                        .foregroundStyle(.ultraThinMaterial)
                        .padding(6)
                        .background(.ultraThinMaterial)
                        .cornerRadius(12)
                }
            }
        }
    }
}